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

import Tool, { IToolMessageEvent, IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IBlenderToolSettings extends IToolSettings
{
    inputMeshFile: string;
    mode: string;
    inputVoyagerFile?: string;
    outputFile?: string;
    inputMeshFile2?: string;
    outputFile2?: string;
    inputBaseName?: string;
    scaleToMeters?: boolean;

    //** Web asset specific settings */
    format?: string;
    metallicFactor?: number;
    roughnessFactor?: number;
    diffuseMapFile?: string;
    occlusionMapFile?: string;
    emissiveMapFile?: string;
    metallicRoughnessMapFile?: string;
    normalMapFile?: string;
    objectSpaceNormals?: boolean;
    useCompression?: boolean;
    compressionLevel?: number;
    alphaBlend?: boolean;
    embedMaps?: boolean;
}

export type BlenderInstance = ToolInstance<BlenderTool, IBlenderToolSettings>;

export default class BlenderTool extends Tool<BlenderTool, IBlenderToolSettings>
{
    static readonly toolName = "Blender";

    protected static readonly defaultSettings: Partial<IBlenderToolSettings> = { };

    onInstanceMessage(event: IToolMessageEvent): boolean
    {
        const { instance, message } = event;

        // catch unlinked material and log to instance
        if(message.includes("cannot read from MTL file")) {
            instance.report.execution.log.push({"time":event.time.toString(), "level":event.level, "message":"Unlinked material"});
        }

        // filter potential issue messages
        if (message.toLowerCase().includes("error") || message.toLowerCase().includes("warning") || message.toLowerCase().includes("invalid")
        || message.toLowerCase().includes("cannot") || message.toLowerCase().includes("fail") || message.toLowerCase().includes("missing")
        || message.toLowerCase().includes("can't") || message.toLowerCase().includes("unsupported")) {
            if(!(message.startsWith("\nJSON=") || message.startsWith("JSON="))) {
                event.message = "[ISSUE] " + message;
                return false;
            }
        }

        // only handle JSON report data
        if (!(message.startsWith("\nJSON=") || message.startsWith("JSON="))) {
            return false;
        }

        const idx = message.indexOf("JSON=") + 5;

        const report = instance.report.execution;
        const results = report.results = report.results || {};

        try {
            results["inspection"] = JSON.parse(message.substr(idx));

            // catch unlinked materials and modify report accordingly
            const badMaterial = instance.report.execution.log.some((elem) => {return elem.message.includes("Unlinked material");});
            if(badMaterial) {
                for(var key in results.inspection.scene.materials) {
                    var name = results.inspection.scene.materials[key]["name"];
                    results.inspection.scene.materials[key] = {"name":name, "error":"not found"};
                }
            }
            
        }
        catch(e) {
            const error = "failed to parse mesh inspection report";
            results["inspection"] = { error };
        }

        return true;
    }

    async setupInstance(instance: BlenderInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputFilePath = instance.getFilePath(settings.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        } 

        let operation = ` --background`;
        if(settings.mode === "standardize") {
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderOrientToVoyager.py")}" -- "${inputFilePath}" "${instance.getFilePath(settings.inputVoyagerFile)}" "${instance.getFilePath(settings.outputFile)}" "${settings.scaleToMeters}"`;
        }
        else if(settings.mode === "inspect") {
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderInspectMesh.py")}" -- "${inputFilePath}"`;
        }
        else if(settings.mode === "convert") {
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderConvert.py")}" -- "${inputFilePath}" "${instance.getFilePath(settings.outputFile)}"`;
        }
        else if(settings.mode === "combine") {
            let combineFilePath = instance.getFilePath(settings.inputMeshFile2);
            if (combineFilePath && (combineFilePath == inputFilePath)) {
                combineFilePath = "";
            }
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderCombineMesh.py")}" -- "${inputFilePath}" "${combineFilePath}" "${instance.getFilePath(settings.outputFile)}" "${settings.inputBaseName}"`;
        }
        else if(settings.mode === "merge") {
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderMergeTextures.py")}" -- "${inputFilePath}" "${instance.getFilePath(settings.outputFile2)}" "${instance.getFilePath(settings.outputFile)}"`;
        }
        else if(settings.mode === "screenshot") {
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderScreenshot.py")}" -- "${inputFilePath}"`;
        }
        else if(settings.mode === "webasset") {
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderWebAsset.py")}" -- -i "${instance.getFilePath(settings.inputMeshFile)}" -o "${instance.getFilePath(settings.outputFile)}" -f "${settings.format}"`;
        
            if(settings.diffuseMapFile) {
                operation += ` -dm "${instance.getFilePath(settings.diffuseMapFile)}"`;
            }
            if(settings.occlusionMapFile) {
                operation += ` -om "${instance.getFilePath(settings.occlusionMapFile)}"`;
            }
            if(settings.metallicRoughnessMapFile) {
                operation += ` -mrm "${instance.getFilePath(settings.metallicRoughnessMapFile)}"`;
            }
            if(settings.normalMapFile) {
                operation += ` -nm "${instance.getFilePath(settings.normalMapFile)}"`;
            }

            operation += ` -uc "${settings.useCompression}" -mb "${settings.embedMaps}" -mf "${settings.metallicFactor}" -rf "${settings.roughnessFactor}" -cl ${settings.compressionLevel} -ab ${settings.alphaBlend} -os ${settings.objectSpaceNormals}`;
        }

        const command = `"${this.configuration.executable}" ${operation}`;

        return Promise.resolve({ command });
    }
}