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
    /** Name of the geometry file to convert. */
    sourceFile: string;
    /** File name of the resulting web asset. */
    outputFile: string;
    /** Uniform scale to apply during conversion */
    scale?: number;
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

    static readonly description = "Generates a usdz asset from another self-contained format";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            sourceFile: { type: "string", minLength: 1 },
            outputFile: { type: "string", minLength: 1 },
            scale: { type: "number", default: 100},
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: { type: "string", enum: [ "Unity", "RapidCompact" ], default: "RapidCompact" }
        },
        required: [
            "sourceFile",
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
                inputMeshFile: params.sourceFile,
                outputMeshFile: params.outputFile,
                timeout: params.timeout
            };

            this.addTool("Unity", settings);
        }
        else if(params.tool === "RapidCompact")
        {
            const settings: IRapidCompactToolSettings = {
                inputMeshFile: params.sourceFile,
                outputMeshFile: params.outputFile,
                mode: "convert",
                scale: params.scale,
                timeout: params.timeout
            };

            this.addTool("RapidCompact", settings);
        }
        else {
            throw new Error("GenerateUsdzTask.constructor - unknown tool: " + params.tool);  
        }
    }
}