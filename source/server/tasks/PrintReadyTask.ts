/**
 * 3D Foundation Project
 * Copyright 2025 Smithsonian Institution
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

import { IGeomagicWrapToolSettings } from "../tools/GeomagicWrapTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[PrintReadyTask]] */
export interface IPrintReadyTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Output mesh file name. */
    outputMeshFile: string;
    /** Input mesh units. */
    inputUnits: string;
    /** Output mesh units. */
    outputUnits?: string;
    /** Optional scaling factor. */
    scale?: number;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number,
    /** Tool to be used for unwrapping, options are "GeomagicWrap" */
    tool?: "GeomagicWrap";
}

/**
 * Unwraps a mesh's surface onto a plane and generates a set of texture coordinates for map baking.
 *
 * - Parameters: [[IPrintReadyTaskParameters]].
 * - Tools: [[GeomagicWrap]].
 */
export default class PrintReadyTask extends ToolTask
{
    static readonly taskName = "PrintReady";

    static readonly description = "Fix common print-ready mesh issues.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            inputUnits: { type: "string", enum: ["in","mm","cm","ft","m","km"], default: "mm" },
            outputUnits: { type: "string", enum: ["in","mm","cm","ft","m","km"], default: "mm" },
            scale: { type: "number", minimum: 0.01, default: 1.0 },
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: {
                type: "string",
                enum: [ "GeomagicWrap" ],
                default: "GeomagicWrap"
            }
        },
        required: [
            "inputMeshFile",
            "outputMeshFile",
            "inputUnits"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(PrintReadyTask.parameterSchema);

    constructor(params: IPrintReadyTaskParameters, context: Job)
    {
        super(params, context);

        switch(params.tool) {
            case "GeomagicWrap":

                const geomagicWrapSettings: IGeomagicWrapToolSettings = {
                    inputMeshFile: params.inputMeshFile,
                    outputMeshFile: params.outputMeshFile,
                    inputUnits: params.inputUnits,
                    outputUnits: params.outputUnits,
                    scale: params.scale,
                    timeout: params.timeout
                };

                this.addTool("GeomagicWrap", geomagicWrapSettings);
                break;

            default:
                throw new Error("unknown tool: " + params.tool);
        }
    }
}