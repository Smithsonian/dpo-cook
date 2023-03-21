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

import * as fs from "fs-extra";

import Job from "../app/Job";

import SlicerTool, { ISlicerToolSettings } from "../tools/3DSlicerTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask, { ToolInstance } from "../app/ToolTask";


////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[ProcessVolumeTask]]. */
export interface IProcessVolumeTaskParameters extends ITaskParameters
{
    /** Input image folder. */
    inputImageFolder: string;
    /** Base name used for output files */
    outputFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** The inspection tool to be used. Default is Meshlab. */
    tool?: "3DSlicer";
}

/**
 * Processes volumetric data into a triangle-based mesh.
 *
 * Parameters: [[ISlicerMeshTaskParameters]]
 */
export default class ProcessVolumeTask extends ToolTask
{
    static readonly taskName = "Process Volume";

    static readonly description = "Processes volumetric data into a triangle-based mesh.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFolder: { type: "string", minLength: 1 },
            outputFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: { type: "string", enum: [ "3DSlicer" ], default: "3DSlicer" }
        },
        required: [
            "inputImageFolder",
            "outputFile",
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(ProcessVolumeTask.parameterSchema);

    constructor(params: IProcessVolumeTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "3DSlicer") {
            const settings: ISlicerToolSettings = {
                inputFile: params.inputImageFolder,
                timeout: params.timeout
            };

            this.addTool("3DSlicer", settings);
        }
        else {
            throw new Error("ProcessVolumeTask.constructor - unknown tool: " + params.tool);
        }
    }
}