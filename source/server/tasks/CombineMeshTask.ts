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

/** Parameters for [[CombineMeshTask]]. */
export interface ICombineMeshTaskParameters extends ITaskParameters
{
    /** Base mesh file name. */
    baseMeshFile: string;
    /** Input mesh file name to combine with base. */
    inputMeshFile: string;
    /** Output mesh file name. */
    outputMeshFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Combines meshes into a single self contained .fbx
 *
 * Parameters: [[ICombineMeshTaskParameters]].
 * Tool: [[BlenderTool]].
 */
export default class CombineMeshTask extends ToolTask
{
    static readonly taskName = "CombineMesh";

    static readonly description = "Combines meshes into a single self contained .fbx";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            baseMeshFile: { type: "string", minLength: 1 },
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", default: 0 }
        },
        required: [
            "baseMeshFile",
            "inputMeshFile",
            "outputMeshFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(CombineMeshTask.parameterSchema);

    constructor(params: ICombineMeshTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IBlenderToolSettings = {
            inputMeshFile: params.baseMeshFile,
            inputMeshFile2: params.inputMeshFile,
            outputFile: params.outputMeshFile,
            mode: "combine",
            timeout: params.timeout
        };

        this.addTool("Blender", settings);
    }
}