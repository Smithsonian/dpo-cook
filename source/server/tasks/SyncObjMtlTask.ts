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

import * as fs from "fs";
import * as path from "path";

import Job from "../app/Job";

import { ICscriptToolSettings } from "../tools/CscriptTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[SyncObjMtlTask]]. */
export interface ISyncObjMtlTaskParameters extends ITaskParameters
{
    /** Name of the obj file to sync. */
    objFile: string;
    /** Name of the mtl file to sync to the obj. */
    mtlFile: string;
    /** Name of the texture file to be referenced in the mtl. */
    textureFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Default tool is MeshSmith. Specify another tool if needed. */
    tool?: "Cscript";
}

/**
 * Makes sure a mtl file exists for the supplied obj and that
 * the obj correctly references it.
 *
 * Parameters: [[ISyncObjMtlTaskParameters]].
 */
export default class SyncObjMtlTask extends ToolTask
{
    static readonly taskName = "SyncObjMtl";

    static readonly description = "Ensures a mtl file exists and the obj references it correctly.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            objFile: { type: "string", minLength: 1 },
            mtlFile: { type: "string", minLength: 1 },
            textureFile: { type: "string", minLength: 0, default: "" },
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: { type: "string", enum: [ "Cscript" ], default: "Cscript" }
        },
        required: [
            "objFile",
            "mtlFile",
            "textureFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(SyncObjMtlTask.parameterSchema);

    constructor(params: ISyncObjMtlTaskParameters, context: Job)
    {
        super(params, context);

        let generatedMtl = false;

        const objFilePath = path.resolve(this.context.jobDir, params.objFile);
        const mtlFilePath = path.resolve(this.context.jobDir, params.mtlFile);

        // Create mtl file if needed.
        try {
            if(!fs.existsSync(mtlFilePath)) {
                // default mtl file
                const mtlString = `newmtl ml\nmap_Kd ${params.textureFile}`;

                fs.writeFile(mtlFilePath, mtlString, function (err) {
                    if (err) throw err;
                });

                generatedMtl = true;
            }
        }
        catch(err) {
            throw new Error("File system error. Can't check mtl file.");
        }

        if (params.tool === "Cscript") {
            
            let script = "";
            //const objBuffer = fs.readFileSync(objFilePath);
            //if(generatedMtl || !objBuffer.includes("mtllib") || !objBuffer.includes("usemtl")) {
                const scriptPath = path.resolve(this.context.jobDir, "../../scripts/InjectMTL2.vbs");

                script = `"${scriptPath}" "${objFilePath}" "${params.mtlFile}"`;             
            //}

            const settings: ICscriptToolSettings = {
                scriptToExecute: script,
                timeout: params.timeout
            };

            this.addTool("Cscript", settings);
        }
        else {
            throw new Error("SyncObjMtlTask.constructor - unknown tool: " + params.tool);  
        }
    }
}