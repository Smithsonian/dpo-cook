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

import { IBlenderToolSettings } from "../tools/BlenderTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[ScreenshotTask]]. */
export interface IScreenshotTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Output screenshot file name. */
    outputFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Generates a screenshot of the provided geometry
 *
 * Parameters: [[IScreenshotTaskParameters]].
 * Tool: [[BlenderTool]].
 */
export default class ScreenshotTask extends ToolTask
{
    static readonly taskName = "Screenshot";

    static readonly description = "Generates a screenshot of the provided geometry";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", default: 0 }
        },
        required: [
            "inputMeshFile", "outputFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(ScreenshotTask.parameterSchema);

    constructor(params: IScreenshotTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IBlenderToolSettings = {
            inputMeshFile: params.inputMeshFile,
            outputFile: params.outputFile,
            mode: "screenshot",
            timeout: params.timeout
        };

        this.addTool("Blender", settings);
    }
}