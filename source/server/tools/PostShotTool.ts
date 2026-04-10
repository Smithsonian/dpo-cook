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

export interface IPostShotToolSettings extends IToolSettings
{
    imageInputFolder: string;
    outputFile?: string;
    camerasFile?: string;
    pointsFile?: string;
    imagesFile?: string;
    profile?: string;
    antiAliasing?: boolean;
    maxSHDegree?: number;
    downscale?: boolean;
}

////////////////////////////////////////////////////////////////////////////////

export type PostShotInstance = ToolInstance<PostShotTool, IPostShotToolSettings>;

export default class PostShotTool extends Tool<PostShotTool, IPostShotToolSettings>
{
    static readonly toolName = "PostShot";

    protected static readonly defaultOptions: Partial<IPostShotToolSettings> = {};

    onInstanceMessage(event: IToolMessageEvent): boolean
    {
        const { instance, message } = event;

        if (message.startsWith("Training Radiance Field")) {
            return true;
        }

        return false;
    }

    async setupInstance(instance: PostShotInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;
        const inputFolder = path.parse(settings.imageInputFolder).name;
        const name = path.parse(settings.outputFile).name;

        const inputImageFolder = instance.getFilePath(inputFolder);
        if (!inputImageFolder) {
            throw new Error("PostShotTool: missing image folder name");
        }

        const outputDirectory = instance.workDir;

        let operations = "";
        operations += ` train -i "${inputImageFolder}"`;

        if(settings.camerasFile) {
            const camerasPath = instance.getFilePath(settings.camerasFile);
            if (!camerasPath) {
                throw new Error("PostShotTool: bad camera file path");
            }
            else {
                operations += ` "${camerasPath}"`;
            }
        }

        if(settings.pointsFile) {
            const pointsPath = instance.getFilePath(settings.pointsFile);
            if (!pointsPath) {
                throw new Error("PostShotTool: bad points file path");
            }
            else {
                operations += ` "${pointsPath}"`;
            }
        }

        if(settings.imagesFile) {
            const imagesPath = instance.getFilePath(settings.imagesFile);
            if (!imagesPath) {
                throw new Error("PostShotTool: bad images file path");
            }
            else {
                operations += ` "${imagesPath}"`;
            }
        }

        if(settings.profile) {
            operations += ` --profile "${settings.profile}"`;
        }

        if(settings.antiAliasing) {
            operations += ` --anti-aliasing ${settings.antiAliasing}`;
        }

        if(settings.maxSHDegree) {
            operations += ` --max-sh-degree ${settings.maxSHDegree}`;
        }

        if(settings.downscale === false) {
            operations += ` --max-image-size 0`;
        }

        operations += ` --show-train-error -o "${outputDirectory}\\${name}.psht" --export-splat-ply "${outputDirectory}\\${name}.ply"`;

        const command = `"${this.configuration.executable}" ${operations}`;

        return Promise.resolve({ command });
    }
}