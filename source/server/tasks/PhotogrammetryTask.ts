/**
 * 3D Foundation Project
 * Copyright 2022 Smithsonian Institution
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

/** Parameters for [[PhotogrammetryTask]] */
export interface IPhotogrammetryTaskParameters extends ITaskParameters
{
    /** Input image folder. */
    inputImageFolder: string;
    /** Base name used for output files */
    outputFile: string;
    /** Name used for saved camera position file */
    camerasFile: string;
    /** CSV file with scalebar markers and distances */
    scalebarFile: string;
    /** Flag to enable building a dense point cloud */
    generatePointCloud: boolean;
    /** Flag to enable discarding high-error markers */
    optimizeMarkers: boolean;
    /** Percent success required to pass alignment stage */
    alignmentLimit?: number;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Tool to use for photogrammetry ("Metashape" or "RealityCapture" or "Meshroom", default: "Metashape"). */
    tool?: "Metashape" | "RealityCapture" | "Meshroom";
}

/**
 * Generates a mesh and texture from an image set
 *
 * Parameters: [[IPhotogrammetryTaskParameters]]
 * Tools: [[MetashapeTool]], [[RealityCaptureTool]]
 */
export default class PhotogrammetryTask extends ToolTask
{
    static readonly taskName = "Photogrammetry";

    static readonly description = "Generates a mesh and texture from an image set using photogrammetry techniques.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFolder: { type: "string", minLength: 1 },
            outputFile: { type: "string", minLength: 1 },
            camerasFile: { type: "string", minLength: 1 },
            scalebarFile: { type: "string", minLength: 1 },
            generatePointCloud: { type: "boolean", default: false},
            optimizeMarkers: { type: "boolean", default: false},
            alignmentLimit: { type: "number", default: 50},
            timeout: { type: "integer", default: 0 },
            tool: { type: "string", enum: [ "Metashape", "RealityCapture", "Meshroom" ], default: "Metashape" }
        },
        required: [
            "inputImageFolder",
            "outputFile",
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(PhotogrammetryTask.parameterSchema);

    constructor(params: IPhotogrammetryTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "Metashape") {
            const toolOptions: IMetashapeToolSettings = {
                imageInputFolder: params.inputImageFolder,
                outputFile: params.outputFile,
                camerasFile: params.camerasFile,
                scalebarFile: params.scalebarFile,
                generatePointCloud: params.generatePointCloud,
                optimizeMarkers: params.optimizeMarkers,
                alignmentLimit: params.alignmentLimit,
                mode: "full",
                timeout: params.timeout
            };

            this.addTool("Metashape", toolOptions);
        }
        else if (params.tool === "RealityCapture") {
            const toolOptions: IRealityCaptureToolSettings = {
                imageInputFolder: params.inputImageFolder,
                outputFile: params.outputFile,
                scalebarFile: params.scalebarFile,
                generatePointCloud: params.generatePointCloud,
                timeout: params.timeout
            };

            this.addTool("RealityCapture", toolOptions);
        }
        else if (params.tool === "Meshroom") {
            const toolOptions: IMeshroomToolSettings = {
                imageInputFolder: params.inputImageFolder,
                outputFile: params.outputFile,
                scalebarFile: params.scalebarFile,
                generatePointCloud: params.generatePointCloud,
                timeout: params.timeout
            };

            this.addTool("Meshroom", toolOptions);
        }
        else {
            throw new Error("PhotogrammetryTask.constructor - unknown tool: " + params.tool);
        }
    }
}