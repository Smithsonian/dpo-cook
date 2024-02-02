/**
 * 3D Foundation Project
 * Copyright 2023 Smithsonian Institution
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Job from "../app/Job";

import { IMetashapeToolSettings } from "../tools/MetashapeTool";
import { IRealityCaptureToolSettings } from "../tools/RealityCaptureTool";
import { IMeshroomToolSettings } from "../tools/MeshroomTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";


////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[PhotogrammetryTexTask]] */
export interface IPhotogrammetryTexTaskParameters extends ITaskParameters
{
    /** Input image folder. */
    inputImageFolder: string;
    /** Input model to texture. */
    inputModelFile: string;
    /** Base name used for output files */
    outputFile: string;
    /** Name used for saved camera position file */
    camerasFile: string;
    /** CSV file with scalebar markers and distances */
    scalebarFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Tool to use for photogrammetry ("Metashape" or "RealityCapture" or "Meshroom", default: "Metashape"). */
    tool?: "Metashape" | "RealityCapture" | "Meshroom";
}

/**
 * Generates and maps a texture from model and image set
 *
 * Parameters: [[IPhotogrammetryTexTaskParameters]]
 * Tools: [[MetashapeTool]], [[RealityCaptureTool], [[MeshRoomTool]]
 */
export default class PhotogrammetryTexTask extends ToolTask
{
    static readonly taskName = "PhotogrammetryTex";

    static readonly description = "Generates and maps a texture from model and image set using photogrammetry techniques.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFolder: { type: "string", minLength: 1 },
            inputModelFile: { type: "string", minLength: 1 },
            outputFile: { type: "string", minLength: 1 },
            camerasFile: { type: "string", minLength: 1 },
            scalebarFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", default: 0 },
            tool: { type: "string", enum: [ "Metashape", "RealityCapture", "Meshroom" ], default: "Metashape" }
        },
        required: [
            "inputImageFolder",
            "outputFile",
            "camerasFile",
            "inputModelFile",
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(PhotogrammetryTexTask.parameterSchema);

    constructor(params: IPhotogrammetryTexTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "Metashape") {
            const toolOptions: IMetashapeToolSettings = {
                imageInputFolder: params.inputImageFolder,
                inputModelFile: params.inputModelFile,
                outputFile: params.outputFile,
                camerasFile: params.camerasFile,
                scalebarFile: params.scalebarFile,
                mode: "texture",
                timeout: params.timeout
            };

            this.addTool("Metashape", toolOptions);
        }
        /*else if (params.tool === "RealityCapture") {
            const toolOptions: IRealityCaptureToolSettings = {
                imageInputFolder: params.inputImageFolder,
                outputFile: params.outputFile,
                scalebarFile: params.scalebarFile,
                timeout: params.timeout
            };

            this.addTool("RealityCapture", toolOptions);
        }
        else if (params.tool === "Meshroom") {
            const toolOptions: IMeshroomToolSettings = {
                imageInputFolder: params.inputImageFolder,
                outputFile: params.outputFile,
                scalebarFile: params.scalebarFile,
                timeout: params.timeout
            };

            this.addTool("Meshroom", toolOptions);
        }*/
        else {
            throw new Error("PhotogrammetryTexTask.constructor - unknown tool: " + params.tool);
        }
    }
}