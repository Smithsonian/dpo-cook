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

import Tool, { IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export type TFBX2glTFComputeNormals = "never" | "broken" | "missing" | "always";

export interface IFBX2glTFToolSettings extends IToolSettings
{
    inputMeshFile: string;
    outputMeshFile: string;
    binary?: boolean;
    compress?: boolean;
    computeNormals?: TFBX2glTFComputeNormals;
    stripNormals?: boolean;
    stripUVs?: boolean;
}

export type FBX2glTFInstance = ToolInstance<FBX2glTFTool, IFBX2glTFToolSettings>;

export default class FBX2glTFTool extends Tool<FBX2glTFTool, IFBX2glTFToolSettings>
{
    static readonly toolName = "FBX2glTF";

    protected static readonly defaultSettings: Partial<IFBX2glTFToolSettings> = {
        binary: true,
        compress: true,
        stripNormals: false,
        stripUVs: false
    };

    async setupInstance(instance: FBX2glTFInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputFilePath = instance.getFilePath(settings.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        }

        const outputFilePath = instance.getFilePath(settings.outputMeshFile);
        if (!outputFilePath) {
            throw new Error("missing output mesh file");
        }

        let options = [];

        if (settings.binary) {
            options.push("--binary");
        }
        if (settings.compress) {
            options.push("--draco");
        }
        if (settings.computeNormals) {
            options.push("--compute-normals " + settings.computeNormals);
        }
        if (settings.stripNormals || settings.stripUVs) {
            options.push("--keep-attribute position");
            if (!settings.stripNormals) {
                options.push("normal");
            }
            if (!settings.stripUVs) {
                options.push("uv0 uv1");
            }
        }

        const executable = this.configuration.executable;
        const command = `"${executable}" -i "${inputFilePath}" -o "${outputFilePath}" ${options.join(" ")}`;

        return Promise.resolve({ command });
    }
}