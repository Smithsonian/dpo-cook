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

import { IRawTherapeeToolSettings } from "../tools/RawTherapeeTool";

import RawTherapeeTool from "../tools/RawTherapeeTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask, { IToolMessageEvent } from "../app/ToolTask";


////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[ProcessRawTask]] */
export interface IProcessRawTaskParameters extends ITaskParameters
{
    /** Input image folder. */
    inputImageFolder: string;
    /** Base name used for output files */
    outputFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Tool to use for ProcessRaw pre-processing ("RawTherapee", default: "RawTherapee"). */
    tool?: "RawTherapee";
}

/**
 * Converts raw images to jpg and pre-processes for photogrammetry pipeline
 *
 * Parameters: [[IProcessRawTaskParameters]]
 * Tools: [[RawTherapeeTool]]
 */
export default class ProcessRawTask extends ToolTask
{
    static readonly taskName = "ProcessRaw";

    static readonly description = "Converts raw images to jpg and pre-processes for photogrammetry pipeline.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFolder: { type: "string", minLength: 1 },
            outputFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", default: 0 },
            tool: { type: "string", enum: [ "RawTherapee" ], default: "RawTherapee" }
        },
        required: [
            "inputImageFolder",
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(ProcessRawTask.parameterSchema);

    constructor(params: IProcessRawTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "RawTherapee") {
            const toolOptions: IRawTherapeeToolSettings = {
                imageInputFolder: params.inputImageFolder,
                //mode: "create",
                timeout: params.timeout
            };

            this.addTool("RawTherapee", toolOptions);
        }
        else {
            throw new Error("ProcessRawTask.constructor - unknown tool: " + params.tool);
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