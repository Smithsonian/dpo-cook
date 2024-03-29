/**
 * 3D Foundation Project
 * Copyright 2021 Smithsonian Institution
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

import { promises as fs } from "fs";
import * as path from "path";

import Job from "../app/Job";

import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[MergeReportsTask]]. */
export interface IMergeReportsTaskParameters extends ITaskParameters
{
    /** File to pull mesh inspection information from. */
    meshReportFile: string;
    /** File to pull material inspection information from. */
    materialReportFile: string;
    /** Writes a detailed, JSON-formatted report to the given file. */
    reportFile?: string;
}

/**
 * Combines separate inspection reports for mesh and materials together
 * using evaluation criteria to link where possible.
 *
 * Parameters: [[IMergeReportsTaskParameters]]
 */
export default class MergeReportsTask extends Task
{
    static readonly taskName = "MergeReports";

    static readonly description = "Merges mesh and material inspection reports into one.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            meshReportFile: {
                type: "string"
            },
            materialReportFile: {
                type: "string"
            },
            reportFile: {
                type: "string"
            }
        }
    };

    protected meshReport = null;
    protected materialReport = null;
    protected finalReport = {};

    static readonly parameterValidator =
        Task.jsonValidator.compile(MergeReportsTask.parameterSchema);

    constructor(options: IMergeReportsTaskParameters, context: Job)
    {
        super(options, context);
    }

    protected async execute(): Promise<unknown>
    {
        const params = this.parameters as IMergeReportsTaskParameters;

        const meshFilePath = path.resolve(this.context.jobDir, params.meshReportFile);
        const materialFilePath = path.resolve(this.context.jobDir, params.materialReportFile);

        await fs.readFile(meshFilePath, "utf8").then(json => {
            // successfully read file: parse JSON
            this.meshReport = JSON.parse(json);
        })
        .catch(() => {throw new Error("could not load mesh report file");}); 

        await fs.readFile(materialFilePath, "utf8").then(json => {
            // successfully read file: parse JSON
            this.materialReport = JSON.parse(json);
        })
        .catch(() => {throw new Error("could not load material report file");});

        const meshes = this.meshReport["meshes"];
        const fileExt = path.extname(this.materialReport["filePath"]);
        
        // merge reports
        if(this.meshReport["scene"]["statistics"]["numMeshes"] > 0) {
            const materials = this.materialReport["scene"]["materials"];
            meshes.forEach((mesh, meshIdx) => {
                const indices = mesh["statistics"]["materialIndex"];

                if(materials.length === 0) {
                    this.meshReport["meshes"][meshIdx]["statistics"]["materialIndex"].length = 0;        
                }

                if(indices.length === 0 && materials.length > 0) {
                    // no index, but we have materials so check for a match
                    indices.push(-1);
                }

                indices.forEach((index, indexIdx) => {
                    const materialName = index >= 0 ? this.meshReport["scene"]["materials"][index]["name"] : "UNKNOWN_MATERIAL";
                 
                    // look for material name match
                    const matches = materials.filter(mat => mat["name"] === materialName);
                    if(matches.length === 1) {
                        this.meshReport["meshes"][meshIdx]["statistics"]["materialIndex"][indexIdx] = materials.findIndex(mat => mat["name"] === materialName);
                    }
                    else {
                        
                        // try to find a match using geometry bounds
                        const bbMatches = this.materialReport["meshes"].filter(mMesh => {
                            const bb1 = mMesh["geometry"]["boundingBox"];
                            const bb2 = mesh["geometry"]["boundingBox"];

                            return Math.abs(bb1.max[0]-bb2.max[0]) <  0.00001 &&
                                Math.abs(bb1.max[1]-bb2.max[1]) <  0.00001 &&
                                Math.abs(bb1.max[2]-bb2.max[2]) <  0.00001 &&
                                Math.abs(bb1.min[0]-bb2.min[0]) <  0.00001 &&
                                Math.abs(bb1.min[1]-bb2.min[1]) <  0.00001 &&
                                Math.abs(bb1.min[2]-bb2.min[2]) <  0.00001;
                        });

                        if(bbMatches.length === 1) {
                            const matIndex = bbMatches[0]["statistics"]["materialIndex"];
                            if(matIndex >= 0) {
                                this.meshReport["meshes"][meshIdx]["statistics"]["materialIndex"][indexIdx] = matIndex;
                            }
                            else {
                                this.meshReport["meshes"][meshIdx]["statistics"]["materialIndex"].splice(indexIdx,1);
                            }
                        }
                        else {
                            // no match found
                            this.meshReport["meshes"][meshIdx]["statistics"]["materialIndex"].splice(indexIdx,1);
                            this.logTaskEvent("debug", `Warning: Could not find a mapping for material "${materialName}"`);
                        }
                    }
                }); 
            });
        }
        
        // OBJ vertex color not supported by Blender, so check for any vc mismatches
        const matMeshes = this.materialReport["meshes"];
        if(fileExt === ".obj") {
            matMeshes.forEach((mesh) => {
                if(mesh["statistics"]["hasVertexColors"] === true) {
                    const bbMatches = meshes.filter(mMesh => {
                        const bb1 = mMesh["geometry"]["boundingBox"];
                        const bb2 = mesh["geometry"]["boundingBox"];

                        return Math.abs(bb1.max[0]-bb2.max[0]) <  0.00001 &&
                            Math.abs(bb1.max[1]-bb2.max[1]) <  0.00001 &&
                            Math.abs(bb1.max[2]-bb2.max[2]) <  0.00001 &&
                            Math.abs(bb1.min[0]-bb2.min[0]) <  0.00001 &&
                            Math.abs(bb1.min[1]-bb2.min[1]) <  0.00001 &&
                            Math.abs(bb1.min[2]-bb2.min[2]) <  0.00001;
                    });

                    if(bbMatches.length === 1) {
                        bbMatches[0]["statistics"]["hasVertexColors"] = true;
                        bbMatches[0]["statistics"]["numColorChannels"] = mesh["statistics"]["numColorChannels"];
                    }
                    else {
                        // no match found
                        throw new Error("Error: Could not sync vertex color between mesh and material reports.");
                    }
                }
            });
        }

        this.finalReport = this.meshReport;
        this.finalReport["scene"]["materials"] = this.materialReport["scene"]["materials"];
        this.finalReport["scene"]["statistics"]["numMaterials"] = this.materialReport["scene"]["statistics"]["numMaterials"];
        this.finalReport["scene"]["statistics"]["numEmbeddedTextures"] = this.materialReport["scene"]["statistics"]["numEmbeddedTextures"];
        this.finalReport["scene"]["statistics"]["numLinkedTextures"] = this.materialReport["scene"]["statistics"]["numLinkedTextures"];
        delete this.finalReport["scene"]["statistics"]["numTextures"];
        
        this.report.result["inspection"] = this.finalReport;

        return Promise.resolve();
    }
}