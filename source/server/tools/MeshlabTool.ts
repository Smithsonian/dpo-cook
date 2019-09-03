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

import uniqueId from "../utils/uniqueId";
import LegacyTool, { IToolOptions, IToolScript, TToolMessageLevel } from "../app/LegacyTool";

////////////////////////////////////////////////////////////////////////////////

export interface IMeshlabFilterParameters
{
    [key:string]: number | boolean | string;
}

export interface MeshlabFilter
{
    name: string;
    params?: IMeshlabFilterParameters;
}

export interface IMeshlabToolOptions extends IToolOptions
{
    inputMeshFile: string;
    outputMeshFile?: string;
    writeNormals?: boolean;
    writeTexCoords?: boolean;
    filters: MeshlabFilter[];
}

export default class MeshlabTool extends LegacyTool
{
    static readonly type: string = "MeshlabTool";

    protected static readonly filters = {
        "Simplification": { name: "Simplification: Quadric Edge Collapse Decimation" },
        "RemoveUnreferencedVertices": { name: "Remove Unreferenced Vertices" },
        "RemoveDuplicateVertices": { name: "Remove Duplicate Vertices" },
        "RemoveZeroAreaFaces": { name: "Remove Zero Area Faces" },
        "RemoveDuplicateFaces": { name: "Remove Duplicate Faces" },
        "RemoveIsolatedFoldedFaces": { name: "Remove Isolated Folded Faces by Edge Flip" },
        "RemoveIsolatedPieces": { name: "Remove Isolated pieces (wrt Diameter)" },
        "ComputeFaceNormals": { name: "Re-Compute Face Normals" },
        "ComputeVertexNormals": { name: "Re-Compute Vertex Normals" },
        "MeshReport": { name: "Generate JSON Report", type: "xml" }
    };

    inspectionReport: any;

    constructor(options: IMeshlabToolOptions, jobDir: string)
    {
        super(options, jobDir);
        this.inspectionReport = null;
    }

    run(): Promise<void>
    {
        const options = this.options as IMeshlabToolOptions;

        const inputMeshPath = this.getFilePath(options.inputMeshFile);
        if (!inputMeshPath) {
            throw new Error("missing input mesh file");
        }

        const outputMeshPath = this.getFilePath(options.outputMeshFile);

        return this.writeFilterScript()
            .then(script => {
                let command = `"${this.configuration.executable}" -i "${inputMeshPath}"`;

                if (outputMeshPath) {
                    command += ` -o "${outputMeshPath}"`;

                    if (options.writeNormals || options.writeTexCoords) {
                        command += " -m";
                        if (options.writeNormals) {
                            command += " vn";
                        }
                        if (options.writeTexCoords) {
                            command += " wt";
                        }
                    }
                }

                command += ` -s "${script.filePath}"`;

                return this.waitInstance(command, script);
            });
    }

    protected onMessage(time: Date, level: TToolMessageLevel, message: string)
    {
        super.onMessage(time, level, message);

        // only handle JSON report data
        if (!message.startsWith("JSON={")) {
            return;
        }

        try {
            this.inspectionReport = JSON.parse(message.substr(5));
        }
        catch(e) {
            const message = "failed to parse mesh inspection report";
            this.inspectionReport = { error: message };
            this.onMessage(time, "warning", message);
        }

        return true;
    }

    private writeFilterScript(): Promise<IToolScript>
    {
        const options = this.options as IMeshlabToolOptions;

        const script = [
            `<!DOCTYPE FilterScript>`,
            `<FilterScript>`
        ];

        options.filters.forEach(filter => {

            let filterSteps = MeshlabTool.filters[filter.name];
            if (!filterSteps) {
                return Promise.reject(`unknown filter: ${filter.name}`);
            }

            filterSteps = Array.isArray(filterSteps) ? filterSteps : [ filterSteps ];

            filterSteps.forEach(filterDef => {
                const filterType = filterDef.type === "xml" ? "xmlfilter" : "filter";

                if (filter.params) {
                    script.push(`<${filterType} name="${filterDef.name}">`);
                    for (const paramName in filter.params) {
                        const paramValue = filter.params[paramName];
                        if (paramValue === undefined) {
                            return Promise.reject(`value for parameter ${paramName} is undefined`);
                        }
                        script.push(this.getParameter(paramName, paramValue));
                    }
                    script.push(`</${filterType}>`);
                }
                else {
                    script.push(`<${filterType} name="${filterDef.name}"/>`);
                }
            });
        });

        script.push("</FilterScript>");

        const filterFileName = "_meshlab_" + uniqueId() + ".mlx";
        const filterFilePath = this.getFilePath(filterFileName);
        return this.writeFile(filterFilePath, script.join("\n"));
    }

    private getParameter(name: string, value: string | number | boolean, type?: string)
    {
        if (typeof value === "string") {
            const parsedValue = parseFloat(value) || 0;

            if (value.indexOf("%") > -1) {
                return `<Param value="${parsedValue}" min="0" max="100" type="RichAbsPerc" name="${name}"/>`;
            }

            value = parsedValue;
        }

        const text = value.toString();
        if (type === undefined) {
            if (typeof value === "number") {
                if (text.indexOf(".") > -1) {
                    type = "RichFloat";
                }
                else {
                    type = "RichInt";
                }
            }
            else if (typeof value === "boolean") {
                type = "RichBool";
            }
        }

        return `<Param value="${value}" type="${type}" name="${name}"/>`;
    }
}