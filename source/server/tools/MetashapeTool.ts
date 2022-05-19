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

////////////////////////////////////////////////////////////////////////////////

export interface IMetashapeToolSettings extends IToolSettings
{
    imageInputFolder: string;
    outputFile?: string;
    scalebarFile?: string;
    generatePointCloud?: boolean;
}

export type MetashapeInstance = ToolInstance<MetashapeTool, IMetashapeToolSettings>;

export default class MetashapeTool extends Tool<MetashapeTool, IMetashapeToolSettings>
{
    static readonly toolName = "Metashape";

    protected static readonly defaultSettings: Partial<IMetashapeToolSettings> = { };

    /*onInstanceMessage(event: IToolMessageEvent): boolean
    {
        const { instance, message } = event;
console.log("MESSAGE\n"+message);
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
    }*/

    async setupInstance(instance: MetashapeInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputFolder = instance.getFilePath(path.parse(settings.imageInputFolder).name);
        if (!inputFolder) {
            throw new Error("missing input image set");
        } 

        let operation = ` -r `;

        operation += `"${instance.getFilePath("../../scripts/MetashapeGenerateMesh.py")}" -i "${inputFolder}"`;

        if(settings.scalebarFile) {
            const sbFIlePath = instance.getFilePath(settings.scalebarFile);
            operation += ` -sb "${sbFIlePath}"`;
        }

        operation += ` -bdc ${settings.generatePointCloud}`;

        //operation += `-platform offscreen `;

        const command = `"${this.configuration.executable}" ${operation}`;

        return Promise.resolve({ command });
    }
}