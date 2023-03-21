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
import Tool, { IToolMessageEvent, IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface ISlicerToolSettings extends IToolSettings
{
    inputFile: string;
    outputFile?: string;
}

export type SlicerInstance = ToolInstance<SlicerTool, ISlicerToolSettings>;

export default class SlicerTool extends Tool<SlicerTool, ISlicerToolSettings>
{
    static readonly toolName = "3DSlicer";

    protected static readonly defaultSettings: Partial<ISlicerToolSettings> = { };

    onInstanceMessage(event: IToolMessageEvent): boolean
    {
        /*const { instance, message } = event;

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
        }*/

        return true;
    }

    async setupInstance(instance: SlicerInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputFolder = instance.getFilePath(path.parse(settings.inputFile).name);
        if (!inputFolder) {
            throw new Error("missing input image set");
        }  

        let operation = ` --python-script ${instance.getFilePath("../../scripts/SlicerGenerateMesh.py")} --no-splash --- "${inputFolder}"`;
        //let operation = ` --python-script ${instance.getFilePath("../../scripts/SlicerGenerateMesh.py")} --no-splash --no-main-window`;

        /*if(settings.mode === "standardize") {
            operation += ` --python "${instance.getFilePath("../../scripts/3DSlicerOrientToVoyager.py")}" -- "${instance.getFilePath(settings.inputMeshFile)}" "${instance.getFilePath(settings.inputVoyagerFile)}" "${instance.getFilePath(settings.outputFile)}" "${settings.scaleToMeters}"`;
        }
        else if(settings.mode === "inspect") {
            operation += ` --python "${instance.getFilePath("../../scripts/3DSlicerInspectMesh.py")}" -- "${instance.getFilePath(settings.inputMeshFile)}"`;
        }
        else if(settings.mode === "convert") {
            operation += ` --python "${instance.getFilePath("../../scripts/3DSlicerConvertToUSD.py")}" -- "${instance.getFilePath(settings.inputMeshFile)}" "${instance.getFilePath(settings.outputFile)}"`;
        }*/

        const command = `"${this.configuration.executable}" ${operation}`;

        return Promise.resolve({ command });
    }
}