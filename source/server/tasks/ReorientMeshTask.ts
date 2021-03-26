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

import * as path from "path";

import Job from "../app/Job";

import { IBlenderToolSettings } from "../tools/BlenderTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[ReorientMeshTask]]. */
export interface IReorientMeshTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Input voyager (svx) file name. */
    inputVoyagerFile: string;
    /** Converted (output) mesh file name. */
    outputMeshFile: string;
    /** Flag that indicates if we should scale the model to meters. */
    scaleToMeters: boolean;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Default tool is MeshSmith. Specify another tool if needed. */
    tool?: "Blender";
}

/**
 * Aligns a mesh file to match with the orientation found in the supplied
 * Voyager (.svx) file.
 *
 * Parameters: [[IReorientMeshTaskParameters]].
 * Tools: [[BlenderTool]]].
 */
export default class ReorientMeshTask extends ToolTask
{
    static readonly taskName = "ReorientMesh";

    static readonly description = "Aligns mesh file with Voyager orientation.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            inputVoyagerFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            scaleToMeters: { type: "boolean", default: false},
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: { type: "string", enum: [ "Blender" ], default: "Blender" }
        },
        required: [
            "inputMeshFile",
            "inputVoyagerFile",
            "outputMeshFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(ReorientMeshTask.parameterSchema);

    constructor(params: IReorientMeshTaskParameters, context: Job)
    {
        super(params, context);

        const inputMeshExt = path.extname(params.inputMeshFile).toLowerCase();
        const inputVoyagerExt = path.extname(params.inputVoyagerFile).toLowerCase();
        const outputMeshExt = path.extname(params.outputMeshFile);

        if (inputMeshExt != ".obj" && inputMeshExt != ".ply") {
            throw new Error("input file type not supported");
        }

        if (inputVoyagerExt != ".svx" && inputVoyagerExt != ".json") {
            throw new Error("voyager file incorrect type");
        }

        // Currently Blender is the only implementation
        if (params.tool === "Blender") {
            const settings: IBlenderToolSettings = {
                inputMeshFile: params.inputMeshFile,
                inputVoyagerFile: params.inputVoyagerFile,
                outputFile: params.outputMeshFile,
                scaleToMeters: params.scaleToMeters,
                mode: "standardize",
                timeout: params.timeout
            };

            this.addTool("Blender", settings);
        }
    }
}