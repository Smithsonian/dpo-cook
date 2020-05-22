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

import { ICscriptToolSettings } from "../tools/CscriptTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";
import { IUnityToolSettings } from "../tools/UnityTool";
import { IRapidCompactToolSettings } from "../tools/RapidCompactTool";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[GenerateUsdzTask]]. */
export interface IGenerateUsdzTaskParameters extends ITaskParameters
{
    /** Name of the obj file to sync. */
    objFile: string;
    /** File name of the resulting web asset. */
    outputFile: string;
    /** Name of the mtl file to sync to the obj. */
    mtlFile?: string;
    /** Name of the texture file referenced in the mtl. */
    textureFile?: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Default tool is Unity. Specify another tool if needed. */
    tool?: "Unity" | "RapidCompact";
}

/**
 * Generate a usdz web asset
 *
 * Parameters: [[IGenerateUsdzTaskParameters]].
 */
export default class GenerateUsdzTask extends ToolTask
{
    static readonly taskName = "GenerateUsdz";

    static readonly description = "Generates a usdz asset from an obj";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            objFile: { type: "string", minLength: 1 },
            outputFile: { type: "string", minLength: 1 },
            mtlFile: { type: "string", minLength: 1 },
            textureFile: { type: "string", minLength: 0, default: "" },
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: { type: "string", enum: [ "Unity", "RapidCompact" ], default: "Unity" }
        },
        required: [
            "objFile",
            "outputFile",
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(GenerateUsdzTask.parameterSchema);

    constructor(params: IGenerateUsdzTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "Unity") {

            const settings: IUnityToolSettings = {
                inputMeshFile: params.objFile,
                outputMeshFile: params.outputFile,
                inputTextureFile: params.textureFile,
                inputMtlFile: params.mtlFile,
                timeout: params.timeout
            };

            this.addTool("Unity", settings);
        }
        else if(params.tool === "RapidCompact")
        {
            const settings: IRapidCompactToolSettings = {
                inputMeshFile: params.objFile,
                outputMeshFile: params.outputFile,
                mode: "convert",
                timeout: params.timeout
            };

            this.addTool("RapidCompact", settings);
        }
        else {
            throw new Error("GenerateUsdzTask.constructor - unknown tool: " + params.tool);  
        }
    }
}