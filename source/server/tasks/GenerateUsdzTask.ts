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
import { promises as fs } from "fs";
import * as path from "path";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask, { ToolInstance } from "../app/ToolTask";
import { IUnityToolSettings } from "../tools/UnityTool";
import { IRapidCompactToolSettings } from "../tools/RapidCompactTool";
import BlenderTool, { IBlenderToolSettings } from "../tools/BlenderTool";
import { IZipTaskParameters } from "./ZipTask";

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
    /** Default tool is Blender. Specify another tool if needed. */
    tool?: "Blender" | "Unity" | "RapidCompact";
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
            tool: { type: "string", enum: [ "Blender", "Unity", "RapidCompact" ], default: "Blender" }
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
        else if(params.tool === "Blender")
        {
            const settings: IBlenderToolSettings = {
                inputMeshFile: params.sourceFile,
                mode: "convert",
                //scale: params.scale,
                timeout: params.timeout
            };

            this.addTool("Blender", settings);
        }
        else {
            throw new Error("GenerateUsdzTask.constructor - unknown tool: " + params.tool);  
        }
    }

    protected async instanceDidExit(instance: ToolInstance)
    {
        if (instance.tool instanceof BlenderTool) {
            const params = this.parameters as IGenerateUsdzTaskParameters;
            const filename = path.parse(params.sourceFile).name;
            const usdaName = filename + ".usda"
            const usdFilePath = path.resolve(this.context.jobDir, usdaName);

            await fs.readFile(usdFilePath, "utf8").then(file => {
                file = file.replace(/\\/g, "/");
                const newUsdFilePath = usdFilePath.replace(usdaName, "a_" + usdaName);  // alpha hack to make sure usd is added to zip before textures
                fs.writeFile(newUsdFilePath, file).then(file => {

                    const zipMeshParams: IZipTaskParameters = {
                        inputFile1: newUsdFilePath,
                        inputFile2: "textures",
                        outputFile: filename + ".usdz",
                        compressionLevel: 0,
                        tool: "SevenZip"
                    };
            
                    const zipTask = this.context.manager.createTask("Zip", zipMeshParams, this.context);
                    return zipTask.run().catch((e) => {throw new Error("Could not zip usdz: "+e);});
                }).catch(() => {throw new Error("could not write updated USD file");});
            })
            .catch(() => {throw new Error("could not read generated USD file");}); 
        }

        return Promise.resolve();
    }
}