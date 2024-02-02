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

/** Parameters for [[MergeMeshTask]]. */
export interface IMergeMeshTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Output mesh file name. */
    outputMeshFile: string;
    /** Output texture file name. */
    outputTextureFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Merges a multi-mesh model file into one .obj and texture
 *
 * Parameters: [[IMergeMeshTaskParameters]].
 * Tool: [[BlenderTool]].
 */
export default class MergeMeshTask extends ToolTask
{
    static readonly taskName = "MergeMesh";

    static readonly description = "Merges a multi-mesh model file into one .obj and texture";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            outputTextureFile: { type: "string" },
            timeout: { type: "integer", default: 0 }
        },
        required: [
            "inputMeshFile",
            "outputMeshFile",
            "outputTextureFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(MergeMeshTask.parameterSchema);

    constructor(params: IMergeMeshTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IBlenderToolSettings = {
            inputMeshFile: params.inputMeshFile,
            outputFile: params.outputMeshFile,
            outputFile2: params.outputTextureFile,
            mode: "merge",
            timeout: params.timeout
        };

        this.addTool("Blender", settings);
    }
}