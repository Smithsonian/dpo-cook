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

import * as path from "path";

import Tool, { IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface ISevenZipToolSettings extends IToolSettings
{
    inputFile1: string;
    inputFile2: string;
    inputFile3: string;
    inputFile4: string;
    inputFile5: string;
    inputFile6: string;
    inputFile7: string;
    inputFile8: string;
    compressionLevel: number;
    fileFilter: string;
    recursive: boolean;
    operation: string;
    outputFile: string;
}

export type SevenZipInstance = ToolInstance<SevenZipTool, ISevenZipToolSettings>;

export default class SevenZipTool extends Tool<SevenZipTool, ISevenZipToolSettings>
{
    static readonly toolName = "SevenZip";

    protected static readonly defaultSettings: Partial<ISevenZipToolSettings> = { };

    async setupInstance(instance: SevenZipInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;
        const activeFiles = [];
        let operation = ``;

        if(settings.inputFile1) activeFiles.push(settings.inputFile1);
        if(settings.inputFile2 && settings.inputFile2.length) activeFiles.push(settings.inputFile2);
        if(settings.inputFile3 && settings.inputFile3.length) activeFiles.push(settings.inputFile3);
        if(settings.inputFile4 && settings.inputFile4.length) activeFiles.push(settings.inputFile4);
        if(settings.inputFile5 && settings.inputFile5.length) activeFiles.push(settings.inputFile5);
        if(settings.inputFile6 && settings.inputFile6.length) activeFiles.push(settings.inputFile6);
        if(settings.inputFile7 && settings.inputFile7.length) activeFiles.push(settings.inputFile7);
        if(settings.inputFile8 && settings.inputFile8.length) activeFiles.push(settings.inputFile8);

        const uniqueFiles : string[] = [...new Set(activeFiles)];

        if(settings.operation === "zip") {
            operation += `a -tzip "${instance.getFilePath(settings.outputFile)}"`;

            uniqueFiles.forEach(function(file) {
                const inputFilePath = instance.getFilePath(file);
                operation += ` "${inputFilePath}"`;
            });

            operation += ` -mx=${settings.compressionLevel}`;
        }
        else if(settings.operation === "unzip") {
            const name = path.parse(settings.inputFile1).name;

            operation += `x "${instance.getFilePath(settings.inputFile1)}" -o"${instance.workDir}\\${name}\\" -r`;
        }
        else if(settings.operation === "path-zip") {
            operation += `a -tzip "${instance.getFilePath(settings.outputFile)}"`;
            operation += ` "${settings.inputFile1}\\*.${settings.fileFilter ? settings.fileFilter : "*"}"`;

            if(settings.recursive === true) {
                operation += ` -r`;
            }
        }

        //if (!inputFilePath) {
        //    throw new Error("missing input mesh file");
        //} 

        const command = `"${this.configuration.executable}" ${operation}`;

        return Promise.resolve({ command });
    }
}