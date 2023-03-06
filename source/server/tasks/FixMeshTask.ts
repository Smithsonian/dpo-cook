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

import { IMeshfixToolSettings } from "../tools/MeshfixTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[FixMeshTask]]. */
export interface IFixMeshTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Fixed (output) mesh file name. */
    outputMeshFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Uses the MeshFix tool to heal a mesh using a number of heuristics.
 *
 * Tool: [[MeshfixTool]]
 * Parameters: [[IFixMeshTaskParameters]]
 */
export default class FixMeshTask extends ToolTask
{
    static readonly taskName = "FixMesh";

    static readonly description = "Uses the MeshFix tool to heal a mesh using a number of heuristics.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", minimum: 0, default: 0 }
        },
        required: [
            "inputMeshFile",
            "outputMeshFile"
        ]
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(FixMeshTask.parameterSchema);

    constructor(params: IFixMeshTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IMeshfixToolSettings = {
            inputMeshFile: params.inputMeshFile,
            outputMeshFile: params.outputMeshFile,
            joinComponents: false,
            timeout: params.timeout
        };

        this.addTool("Meshfix", settings);
    }
}