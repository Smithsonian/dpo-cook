/**
 * 3D Foundation Project
 * Copyright 2026 Smithsonian Institution
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
import Tool, { IToolMessageEvent, IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

export interface ILichtFeldStudioToolSettings extends IToolSettings
{
    colmapInputFolder: string;
    outputFile?: string;
}

////////////////////////////////////////////////////////////////////////////////

export type LichtFeldStudioInstance = ToolInstance<LichtFeldStudioTool, ILichtFeldStudioToolSettings>;

export default class LichtFeldStudioTool extends Tool<LichtFeldStudioTool, ILichtFeldStudioToolSettings>
{
    static readonly toolName = "LichtFeldStudio";

    protected static readonly defaultOptions: Partial<ILichtFeldStudioToolSettings> = {};

    onInstanceMessage(event: IToolMessageEvent): boolean
    {
        const { instance, message } = event;

        if (message.startsWith("Training Radiance Field")) {
            return true;
        }

        return false;
    }

    async setupInstance(instance: LichtFeldStudioInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;
        const inputFolder = path.parse(settings.colmapInputFolder).name;
        const name = path.parse(settings.outputFile).name;

        const colmapInputFolder = instance.getFilePath(inputFolder);
        if (!colmapInputFolder) {
            throw new Error("LichtFeldStudioTool: missing image folder name");
        }

        const outputDirectory = instance.workDir;

        let operations = "";
        operations += ` --train --headless --gut --data-path "${colmapInputFolder}"`;

        operations += ` --output-path "${outputDirectory}\\output"`;

        const command = `"${this.configuration.executable}" ${operations}`;

        return Promise.resolve({ command });
    }
}