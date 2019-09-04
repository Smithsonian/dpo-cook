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

import Tool, { IToolSettings, IToolSetup, IToolScript, ToolInstance, IToolMessageEvent } from "../app/Tool";

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

export interface IMeshlabToolSettings extends IToolSettings
{
    inputMeshFile: string;
    outputMeshFile?: string;
    writeNormals?: boolean;
    writeTexCoords?: boolean;
    filters: MeshlabFilter[];
}

export type MeshlabInstance = ToolInstance<MeshlabTool, IMeshlabToolSettings>;

export default class MeshlabTool extends Tool
{
    static readonly toolName = "Meshlab";

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

    inspectionReport: any = null;


    async setupInstance(instance: MeshlabInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputMeshPath = instance.getFilePath(settings.inputMeshFile);
        if (!inputMeshPath) {
            throw new Error("missing input mesh file");
        }

        const outputMeshPath = instance.getFilePath(settings.outputMeshFile);

        return this.writeFilterScript(instance)
            .then(script => {
                let command = `"${this.configuration.executable}" -i "${inputMeshPath}"`;

                if (outputMeshPath) {
                    command += ` -o "${outputMeshPath}"`;

                    if (settings.writeNormals || settings.writeTexCoords) {
                        command += " -m";
                        if (settings.writeNormals) {
                            command += " vn";
                        }
                        if (settings.writeTexCoords) {
                            command += " wt";
                        }
                    }
                }

                command += ` -s "${instance.getFilePath(script.fileName)}"`;

                return {
                    command,
                    script
                };
            });
    }

    onInstanceMessage(event: IToolMessageEvent)
    {
        const { instance, message } = event;

        // only handle JSON report data
        if (!message.startsWith("JSON={")) {
            return;
        }

        const results = instance.report.results = instance.report.results || {};

        try {
            const inspection = JSON.parse(message.substr(5));
            results["inspection"] = inspection;
        }
        catch(e) {
            const error = "failed to parse mesh inspection report";
            results["inspection"] = { error };
        }

        return true;
    }

    private async writeFilterScript(instance: ToolInstance<MeshlabTool, IMeshlabToolSettings>): Promise<IToolScript>
    {
        const scriptLines = [
            `<!DOCTYPE FilterScript>`,
            `<FilterScript>`
        ];

        instance.settings.filters.forEach(filter => {

            let filterSteps = MeshlabTool.filters[filter.name];
            if (!filterSteps) {
                return Promise.reject(`unknown filter: ${filter.name}`);
            }

            filterSteps = Array.isArray(filterSteps) ? filterSteps : [ filterSteps ];

            filterSteps.forEach(filterDef => {
                const filterType = filterDef.type === "xml" ? "xmlfilter" : "filter";

                if (filter.params) {
                    scriptLines.push(`<${filterType} name="${filterDef.name}">`);
                    for (const paramName in filter.params) {
                        const paramValue = filter.params[paramName];
                        if (paramValue === undefined) {
                            return Promise.reject(`value for parameter ${paramName} is undefined`);
                        }
                        scriptLines.push(this.getParameter(paramName, paramValue));
                    }
                    scriptLines.push(`</${filterType}>`);
                }
                else {
                    scriptLines.push(`<${filterType} name="${filterDef.name}"/>`);
                }
            });
        });

        scriptLines.push("</FilterScript>");

        const script: IToolScript = {
            fileName: "_meshlab_" + uniqueId() + ".mlx",
            content: scriptLines.join("\n"),
        };

        return instance.writeFile(script.fileName, script.content).then(() => script);
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