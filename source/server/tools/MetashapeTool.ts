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
    alignImageFolder?: string;
	maskImageFolder?: string;
    outputFile: string;
    mode: string;
    inputModelFile?: string;
    camerasFile?: string;
    scalebarFile?: string;
    optimizeMarkers?: boolean;
    alignmentLimit?: number;
    tiepointLimit?: number;
    keypointLimit?: number;
    turntableGroups?: boolean;
    depthMaxNeighbors?: number;
    genericPreselection?: boolean;
    meshQuality?: string;
    depthMapQuality?: string;
    customFaceCount?: number;
    maskMode?: string;
}

export type MetashapeInstance = ToolInstance<MetashapeTool, IMetashapeToolSettings>;

export default class MetashapeTool extends Tool<MetashapeTool, IMetashapeToolSettings>
{
    static readonly toolName = "Metashape";

    protected static readonly defaultSettings: Partial<IMetashapeToolSettings> = { };

    onInstanceMessage(event: IToolMessageEvent): boolean
    {
        const { instance, message } = event;

        // keep errors
        if (message.toLowerCase().includes("error") || message.toLowerCase().includes("exception")) {
            return false;
        }

        // keep useful messages
        if (message.endsWith(" seconds") || message.endsWith(" sec") || /*message.endsWith(" points") || message.endsWith(" targets") ||*/
        message.startsWith("Data preload") || message.startsWith("Adding Scalebar") || message.startsWith("Build") || 
        message.startsWith("Detect") || message.startsWith("Export") || message.startsWith("\nCPU") || message.startsWith("Peak m") /*||  
        message.includes("done by")*/) {
            if(message.startsWith("optimize") || message.startsWith("loaded ") || message.startsWith("overlap")
            || message.startsWith("calculating") || message.startsWith("setting ") || message.includes("tracks ")
            || message.includes("matches")) {
                return true;
            }
            else {
                return false;
            }
        }

        return true;
    }

    async setupInstance(instance: MetashapeInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputFolder = instance.getFilePath(path.parse(settings.imageInputFolder).name);
        if (!inputFolder) {
            throw new Error("missing input image set");
        } 

        let operation = ` -r `;

        if(settings.mode === "full") {
            operation += `"${instance.getFilePath("../../scripts/MetashapeGenerateMesh.py")}" -i "${inputFolder}" -o "${settings.outputFile}"`;

            operation += ` -optm ${settings.optimizeMarkers} -tp ${settings.tiepointLimit} -kp ${settings.keypointLimit} `;

            if(settings.alignmentLimit != null) {
                operation += ` -al ${settings.alignmentLimit} `;
            }
            if(settings.alignImageFolder != null) {
                const alignFolder = instance.getFilePath(path.parse(settings.alignImageFolder).name);
                operation += ` -ai "${alignFolder}" `;
            }
			if(settings.maskImageFolder != null) {
                const maskFolder = instance.getFilePath(path.parse(settings.maskImageFolder).name);
                operation += ` -mi "${maskFolder}" `;
            }
            if(settings.maskMode != null) {
                operation += ` -mm ${settings.maskMode} `;
            }
            if(settings.turntableGroups != null) {
                operation += ` -ttg ${settings.turntableGroups} `;
            }
            if(settings.depthMaxNeighbors != null) {
                operation += ` -dmn ${settings.depthMaxNeighbors} `;
            }
            if(settings.genericPreselection != null) {
                operation += ` -gp ${settings.genericPreselection} `;
            }
            if(settings.meshQuality) {
                const opts = [ "Low", "Medium", "High", "Custom" ];
                const qualityIdx = opts.findIndex((e) => e == settings.meshQuality);
                operation += ` -mq ${qualityIdx} `;

                if(qualityIdx == 3) {
                    operation += ` -cfc ${settings.customFaceCount} `;
                }
            }
            if(settings.depthMapQuality) {
                const opts = [ "Highest", "High", "Medium", "Low" ];
                const qualityIdx = opts.findIndex((e) => e == settings.depthMapQuality);
                operation += ` -dmq ${qualityIdx} `;
            }
        }
        else if(settings.mode === "texture") {
            const inputModelPath = instance.getFilePath(settings.inputModelFile);
            if (!inputModelPath) {
                throw new Error("missing input model");
            } 

            operation += `"${instance.getFilePath("../../scripts/MetashapeGenerateTexture.py")}" -i "${inputFolder}" -m "${inputModelPath}" -o "${settings.outputFile}"`;
        }

        if(settings.scalebarFile) {
            const sbFilePath = instance.getFilePath(settings.scalebarFile);
            operation += ` -sb "${sbFilePath}"`;
        }

        if(settings.camerasFile) {
            const camFilePath = instance.getFilePath(settings.camerasFile);
            operation += ` -c "${camFilePath}"`;
        }

        const logfile = "_metashape_log_" + settings.mode + ".txt";
        operation += ` > "${instance.getFilePath(logfile)}" 2>&1`;

        //operation += `-platform offscreen `;

        const command = `"${this.configuration.executable}" ${operation}`;

        return Promise.resolve({ command });
    }
}