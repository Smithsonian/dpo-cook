/**
 * 3D Foundation Project
 * Copyright 2022 Smithsonian Institution
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

export interface IMeshroomToolSettings extends IToolSettings
{
    imageInputFolder: string;
    outputFile?: string;
    scalebarFile?: string;
}

////////////////////////////////////////////////////////////////////////////////

export type MeshroomInstance = ToolInstance<MeshroomTool, IMeshroomToolSettings>;

export default class MeshroomTool extends Tool<MeshroomTool, IMeshroomToolSettings>
{
    static readonly toolName = "Meshroom";

    protected static readonly defaultOptions: Partial<IMeshroomToolSettings> = {};

    async setupInstance(instance: MeshroomInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;
        const name = path.parse(settings.imageInputFolder).name;

        const inputImageFolder = instance.getFilePath(name);
        if (!inputImageFolder) {
            throw new Error("MeshroomTool: missing image folder name");
        }

        const outputDirectory = instance.workDir;

        let operations = "";
        operations += ` -I "${inputImageFolder}" -p "photogrammetry" -o "${outputDirectory}" --save "${outputDirectory}\\project.mg"`;
        
        const command = `"${this.configuration.executable}" ${operations}`;

        return Promise.resolve({ command });
    }
}