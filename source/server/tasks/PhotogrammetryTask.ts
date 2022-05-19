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

import MetashapeTool from "../tools/MetashapeTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask, { IToolMessageEvent } from "../app/ToolTask";


////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[PhotogrammetryTask]] */
export interface IPhotogrammetryTaskParameters extends ITaskParameters
{
    /** Input image folder. */
    inputImageFolder: string;
    /** Base name used for output files */
    outputFile: string;
    /** CSV file with scalebar markers and distances */
    scalebarFile: string;
    /** Flag to enable building a dense point cloud */
    generatePointCloud: boolean;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Tool to use for photogrammetry ("Metashape", default: "Metashape"). */
    tool?: "Metashape";
}

/**
 * Generates a mesh and texture from an image set
 *
 * Parameters: [[IPhotogrammetryTaskParameters]]
 * Tools: [[MetashapeTool]]
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
            scalebarFile: { type: "string", minLength: 1 },
            generatePointCloud: { type: "boolean", default: false},
            timeout: { type: "integer", default: 0 },
            tool: { type: "string", enum: [ "Metashape" ], default: "Metashape" }
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
                scalebarFile: params.scalebarFile,
                generatePointCloud: params.generatePointCloud,
                //mode: "create",
                timeout: params.timeout
            };

            this.addTool("Metashape", toolOptions);
        }
        else {
            throw new Error("PhotogrammetryTask.constructor - unknown tool: " + params.tool);
        }
    }

    /**
     * Watch instance messages for a JSON formatted inspection report.
     * @param event
     */
    /*protected onInstanceMessage(event: IToolMessageEvent)
    {
        const { instance, message } = event;
        const inspectMesh = (this.parameters as IDecimateMeshTaskParameters).inspectMesh;

        if (inspectMesh && instance.tool instanceof MeshlabTool && message.startsWith("JSON={")) {

            let inspectionReport = null;

            try {
                inspectionReport = JSON.parse(message.substr(5));
                this.report.result["inspection"] = inspectionReport;

                if (typeof inspectMesh === "string") {
                    const reportFilePath = instance.getFilePath(inspectMesh);
                    fs.writeFileSync(reportFilePath, JSON.stringify(inspectionReport), "utf8");
                }
            }
            catch(e) {
                this.logTaskEvent("warning", "failed to parse mesh inspection report");
            }
        }
        else {
            super.onInstanceMessage(event);
        }
    }*/
}