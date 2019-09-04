/**
 * 3D Foundation Project
 * Copyright 2019 Smithsonian Institution
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

import { IMeshlabToolSettings } from "../tools/MeshlabTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[CleanupMeshTask]]. */
export interface ICleanupMeshTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Output mesh file name. */
    outputMeshFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Uses a combination of Meshlab filters to clean a mesh. The following
 * filters are applied:
 * - Remove Zero Area Faces
 * - Remove Unreferenced Vertices
 * - Remove Duplicate Vertices
 * - Remove Duplicate Faces
 *
 * Parameters: [[ICleanupMeshTaskParameters]].
 * Tool: [[MeshlabTool]].
 */
export default class CleanupMeshTask extends ToolTask
{
    static readonly description = "Uses a combination of Meshlab filters to clean a mesh.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", default: 0 }
        },
        required: [
            "inputMeshFile",
            "outputMeshFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(CleanupMeshTask.parameterSchema);

    constructor(params: ICleanupMeshTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IMeshlabToolSettings = {
            inputMeshFile: params.inputMeshFile,
            outputMeshFile: params.outputMeshFile,
            filters: [{
                name: "Cleanup",
            }],
            timeout: params.timeout
        };

        this.addTool("Meshlab", settings);
    }
}