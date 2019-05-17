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

import { IInstantMeshesToolOptions } from "../tools/InstantMeshesTool";
import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[RemeshTask]]. */
export interface IRemeshTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Remeshed (output) mesh file name. */
    outputMeshFile: string;
    /** Target number of faces for the new mesh. */
    numFaces: number;
    /** Generates a quad-only mesh if true. */
    quadsOnly?: boolean;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Generates a new, regular mesh for an object.
 *
 * Tool: [[InstantMeshesTool]],
 * Parameters: [[IRemeshTaskParameters]]
 */
export default class RemeshTask extends Task
{
    static readonly description = "Creates a new, regular mesh for an object.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            numFaces: { type: "integer", minimum: 100 },
            quadsOnly: { type: "boolean" },
            timeout: { type: "integer", minimum: 0, default: 0 }
        },
        required: [
            "inputMeshFile",
            "outputMeshFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(RemeshTask.parameterSchema);

    constructor(params: IRemeshTaskParameters, context: Job)
    {
        super(params, context);

        const toolOptions: IInstantMeshesToolOptions = {
            inputMeshFile: params.inputMeshFile,
            outputMeshFile: params.outputMeshFile,
            faceCount: params.numFaces,
            dominant: !params.quadsOnly,
            timeout: params.timeout
        };

        this.addTool("InstantMeshes", toolOptions);
    }
}