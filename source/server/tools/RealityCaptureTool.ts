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

export interface IRealityCaptureToolSettings extends IToolSettings
{
    imageInputFolder: string;
    outputFile?: string;
    scalebarFile?: string;
    generatePointCloud?: boolean;
}

////////////////////////////////////////////////////////////////////////////////

export type RealityCaptureInstance = ToolInstance<RealityCaptureTool, IRealityCaptureToolSettings>;

export default class RealityCaptureTool extends Tool<RealityCaptureTool, IRealityCaptureToolSettings>
{
    static readonly toolName = "RealityCapture";

    protected static readonly defaultOptions: Partial<IRealityCaptureToolSettings> = {};

    async setupInstance(instance: RealityCaptureInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;
        const name = path.parse(settings.imageInputFolder).name;

        const inputImageFolder = instance.getFilePath(name);
        if (!inputImageFolder) {
            throw new Error("RealityCaptureTool: missing image folder name");
        }

        const outputDirectory = instance.workDir;

        let operations = "";
        operations += ` -stdConsole -newScene -addFolder "${inputImageFolder}" -align -setReconstructionRegionAuto -calculateNormalModel -selectMarginalTriangles`;
        operations += ` -removeSelectedTriangles -renameSelectedModel "${name}_model" -calculateTexture -save "${outputDirectory}\\${name}.rcproj" -exportModel "${name}_model" "${outputDirectory}\\${name}_rc.obj" -quit`;

        const command = `"${this.configuration.executable}" ${operations}`;

        return Promise.resolve({ command });
    }
}