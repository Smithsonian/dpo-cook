/**
 * 3D Foundation Project
 * Copyright 2023 Smithsonian Institution
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
        "SelectSmallComponents": { name: "Select small disconnected component"},
        "DeleteSelected": { name: "Delete Selected Faces and Vertices"},
        "CenterScene": { name: "Transform: Translate, Center, set Origin"},
        "ConditionalFaceSelect": { name: "Conditional Face Selection"},
        "SelectConnectedFaces": { name: "Select Connected Faces" },
        "InvertSelection": { name: "Invert Selection" }
        /*"MeshReport": { name: "Generate JSON Report", type: "xml" }*/
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

                let command = `"${this.configuration.executable}"`;
                const isPyMeshLab = this.configuration.executable.toLowerCase().indexOf("meshlabserver") === -1;

                if(isPyMeshLab) {
                    command += ` "${instance.getFilePath("../../scripts/MeshlabExecuteFilter.py")}"`;
                }

                command += ` -i "${inputMeshPath}"`;

                if (outputMeshPath) {
                    command += ` -o "${outputMeshPath}"`;

                    if(!isPyMeshLab) {
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
                    else {
                        command += ` -vn ${settings.writeNormals} -wt ${settings.writeTexCoords}`;
                    }
                }
                
                command += ` -s "${instance.getFilePath(script.fileName)}"`;

                return {
                    command,
                    script
                };
            });
    }

    onInstanceMessage(event: IToolMessageEvent): boolean
    {
        const { instance, message } = event;

        // only handle JSON report data
        if (!message.startsWith("\nJSON={")) {
            return false;
        }

        const report = instance.report.execution;
        const results = report.results = report.results || {};

        try {
            results["inspection"] = JSON.parse(message.substr(6));
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

                if(filterDef.name === "Transform: Translate, Center, set Origin") {
                    scriptLines.push(`<filter name="Transform: Translate, Center, set Origin">`);
                    scriptLines.push(`<Param enum_val1="Center on Scene BBox" enum_val2="Center on Layer BBox" value="1" type="RichEnum" enum_val0="XYZ translation" description="Transformation:" enum_cardinality="4" name="traslMethod"/>`);
                    scriptLines.push(`<Param value="0" type="RichDynamicFloat" description="X Axis" name="axisX"/>`);
                    scriptLines.push(`<Param value="0" type="RichDynamicFloat" description="Y Axis" name="axisY"/>`);
                    scriptLines.push(`<Param value="0" type="RichDynamicFloat" description="Z Axis" name="axisZ"/>`);
                    scriptLines.push(`<Param y="0" z="0" type="RichPosition" description="New Origin:" x="0" name="newOrigin"/>`);
                    scriptLines.push(`<Param value="true" type="RichBool" description="Freeze Matrix" name="Freeze"/>`);
                    scriptLines.push(`<Param value="false" type="RichBool" description="Apply to all visible Layers" name="allLayers"/>`);
                    scriptLines.push(`</filter>`);
                    return;
                }

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
            const parsedValue = parseFloat(value) || null;

            if (value.indexOf("%") > -1) {
                return `<Param value="${parsedValue}" min="0" max="100" type="RichAbsPerc" name="${name}"/>`;
            }

            if (parsedValue == null) {
                return `<Param value="${value}" type="RichString" name="${name}"/>`;
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