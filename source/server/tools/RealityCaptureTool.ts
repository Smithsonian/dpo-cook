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
        operations += ` -set "appIncSubdirs=true" -stdConsole -newScene -addFolder "${inputImageFolder}"`;

        // add scaling info
        if(settings.scalebarFile) {
            operations += ` -detectMarkers`;

            const sbFile: string = await instance.readFile(settings.scalebarFile).then(data => { return data as string })
            .catch( err => { throw new Error(`Error reading scalebar file. ${err}`) });

            const scalebars = sbFile.split(/\r?\n/);
            scalebars.forEach((line, idx) => {
                if(/^\d/.test(line)) { // only parse lines that start with a number
                    const values = line.split(",");
                    if(values.length === 3) {
                        operations += ` -defineDistance ${this.convertMarkerCode(parseInt(values[0]))} ${this.convertMarkerCode(parseInt(values[1]))} ${values[2]} scalebar${idx}`;
                    }
                }
            });
        }

        operations += ` -align -selectMaximalComponent -setReconstructionRegionAuto -calculateHighModel -selectMarginalTriangles`;
        operations += ` -removeSelectedTriangles -renameSelectedModel "${name}_model" -calculateTexture -save "${outputDirectory}\\${name}.rcproj" -exportModel "${name}_model" "${outputDirectory}\\${name}_rc.obj" -quit`;

        const command = `"${this.configuration.executable}" ${operations}`;

        return Promise.resolve({ command });
    }

    // Converts from Metashape numbering to RC naming style
    private convertMarkerCode(code: number) : string {
        let returnCode = "0";

        if(code < 16) {
            returnCode = (code + 16).toString(16);
        }
        else if(code < 39) {
            returnCode = (code + 17).toString(16);
        }
        else if(code < 46) {
            returnCode = (code + 18).toString(16);
        }
        else if(code < 54) {
            returnCode = (code + 22).toString(16);
        }
        else if(code < 57) {
            returnCode = (code + 23).toString(16);
        }
        else if(code < 60) {
            returnCode = (code + 24).toString(16);
        }
        else if(code < 63) {
            returnCode = (code + 25).toString(16);
        }
        else if(code < 70) {
            returnCode = (code + 26).toString(16);
        }
        else if(code < 71) {
            returnCode = (code + 29).toString(16);
        }
        else if(code < 74) {
            returnCode = (code + 30).toString(16);
        }
        else if(code < 81) {
            returnCode = (code + 31).toString(16);
        }
        else if(code < 88) {
            returnCode = (code + 32).toString(16);
        }
        else if(code < 91) {
            returnCode = (code + 33).toString(16);
        }
        else if(code < 94) {
            returnCode = (code + 34).toString(16);
        }
        else if(code < 96) {
            returnCode = (code + 52).toString(16);
        }
        else if(code < 99) {
            returnCode = (code + 53).toString(16);
        }
        else if(code < 104) {
            returnCode = (code + 54).toString(16);
        }
        else {
            // throw error?
        }

        while (returnCode.length < 3) {
            returnCode = "0" + returnCode;
        }

        return "1x12:"+returnCode;
    }
}