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
    useCompression?: boolean;
    compressionLevel?: number;
}

export type BlenderInstance = ToolInstance<BlenderTool, IBlenderToolSettings>;

export default class BlenderTool extends Tool<BlenderTool, IBlenderToolSettings>
{
    static readonly toolName = "Blender";

    protected static readonly defaultSettings: Partial<IBlenderToolSettings> = { };

    onInstanceMessage(event: IToolMessageEvent): boolean
    {
        const { instance, message } = event;

        // only handle JSON report data
        if (!message.startsWith("\nJSON=")) {
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

    async setupInstance(instance: BlenderInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputFilePath = instance.getFilePath(settings.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        } 

        let operation = `--background`;
        if(settings.mode === "standardize") {
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderOrientToVoyager.py")}" -- "${instance.getFilePath(settings.inputMeshFile)}" "${instance.getFilePath(settings.inputVoyagerFile)}" "${instance.getFilePath(settings.outputFile)}" "${settings.scaleToMeters}"`;
        }
        else if(settings.mode === "inspect") {
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderInspectMesh.py")}" -- "${instance.getFilePath(settings.inputMeshFile)}"`;
        }
        else if(settings.mode === "convert") {
            operation += ` --python "${instance.getFilePath("../../scripts/BlenderConvertToUSD.py")}" -- "${instance.getFilePath(settings.inputMeshFile)}" "${instance.getFilePath(settings.outputFile)}"`;
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

            operation += ` -uc "${settings.useCompression}" -cl ${settings.compressionLevel}`;
        }

        const command = `"${this.configuration.executable}" ${operation}`;

        return Promise.resolve({ command });
    }
}