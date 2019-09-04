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

import * as path from "path";

import Tool, { IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IMeshfixToolSettings extends IToolSettings
{
    inputMeshFile: string;
    outputMeshFile: string;
    joinComponents?: boolean;
}

export type MeshfixInstance = ToolInstance<MeshfixTool, IMeshfixToolSettings>;

export default class MeshfixTool extends Tool
{
    static readonly toolName = "Meshfix";

    async setupInstance(instance: MeshfixInstance): Promise<IToolSetup>
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

        const extension = path.extname(outputFilePath);
        if (extension === ".stl") {
            options.push("-j");
        }

        if (settings.joinComponents) {
            options.push("-a");
        }

        const executable = this.configuration.executable;
        const command = `"${executable}" "${inputFilePath}" "${outputFilePath}" ${options.join(" ")}`;

        return Promise.resolve({ command });
    }
}