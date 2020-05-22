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

import * as fs from "fs";
import * as path from "path";

import Tool, { IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IUnityToolSettings extends IToolSettings
{
    inputMeshFile: string;
    inputTextureFile?: string;
    inputMtlFile?: string;
    outputMeshFile?: string;
}

export type UnityInstance = ToolInstance<UnityTool, IUnityToolSettings>;

export default class UnityTool extends Tool<UnityTool, IUnityToolSettings>
{
    static readonly toolName = "Unity";

    protected static readonly defaultSettings: Partial<IUnityToolSettings> = { };

    async setupInstance(instance: UnityInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputFilePath = instance.getFilePath(settings.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        } 
        
        // Copy files to Unity project directory
        const destinationFilePath = this.configuration.projectPath + "\\Assets\\Resources\\"; console.log(`Copy file: ${inputFilePath} to: ${destinationFilePath + "\\" + settings.inputMeshFile}`);
        fs.copyFile(inputFilePath, destinationFilePath + "\\" + settings.inputMeshFile, err => {
            if (err) {
                throw new Error("File system error. Can't copy obj file -" + err);
            }
        });

        if(settings.inputTextureFile)
        {
            const inputTexFilePath = instance.getFilePath(settings.inputTextureFile);
            fs.copyFile(inputTexFilePath, destinationFilePath + settings.inputTextureFile, err => {
                if (err) {
                    throw new Error("File system error. Can't copy texture file.");
                }
            });
        }

        if(settings.inputMtlFile)
        {
            const inputMtlFilePath = instance.getFilePath(settings.inputMtlFile);
            fs.copyFile(inputMtlFilePath, destinationFilePath + settings.inputMtlFile, err => {
                if (err) {
                    throw new Error("File system error. Can't copy material file.");
                }
            });
        }

        
        const operation = `-quit -batchmode -projectPath "${this.configuration.projectPath}" -executeMethod MenuItems.MenuExportSelectedAsUsdz -inputFile "${path.parse(settings.inputMeshFile).base}" -outputPath "${instance.workDir}"`;

        const command = `"${this.configuration.executable}" ${operation}`;

        return Promise.resolve({ command });
    }
}