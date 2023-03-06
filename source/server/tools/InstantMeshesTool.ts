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

export interface IInstantMeshesToolSettings extends IToolSettings
{
    inputMeshFile: string;
    outputMeshFile: string;
    vertexCount?: number;
    faceCount?: number;
    smooth?: number;
    rosy?: number;
    posy?: number;
    deterministic?: boolean;
    dominant?: boolean;
    intrinsic?: boolean;
}

export type InstantMeshesInstance = ToolInstance<InstantMeshesTool, IInstantMeshesToolSettings>;

export default class InstantMeshesTool extends Tool
{
    static readonly toolName = "InstantMeshes";

    protected static readonly defaultOptions: Partial<IInstantMeshesToolSettings> = {
    };

    async setupInstance(instance: InstantMeshesInstance): Promise<IToolSetup>
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

        const options = [];

        if (settings.vertexCount !== undefined) {
            options.push(`-v ${settings.vertexCount}`);
        }
        if (settings.faceCount !== undefined) {
            options.push(`-f ${settings.faceCount}`);
        }
        if (settings.smooth !== undefined) {
            options.push(`-S ${settings.smooth}`);
        }
        if (settings.rosy !== undefined) {
            options.push(`-r ${settings.rosy}`);
        }
        if (settings.posy !== undefined) {
            options.push(`-p ${settings.posy}`);
        }
        if (settings.deterministic) {
            options.push("-d");
        }
        if (settings.dominant) {
            options.push("-D");
        }
        if (settings.intrinsic) {
            options.push("-i");
        }

        const executable = this.configuration.executable;
        const command = `"${executable}" ${options.join(" ")} -o "${outputFilePath}" "${inputFilePath}"`;

        return Promise.resolve({ command });
    }
}