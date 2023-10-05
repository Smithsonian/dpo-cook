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

import Tool, { IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IImageMagickToolSettings extends IToolSettings
{
    /** Name of the RGB input image file. */
    inputImageFile?: string;
    /** Name of the image file for the red channel (optional, only required if combining individual channels). */
    redChannelInputFile?: string;
    /** Name of the image file for the green channel (optional, only required if combining individual channels). */
    greenChannelInputFile?: string;
    /** Name of the image file for the blue channel (optional, only required if combining individual channels). */
    blueChannelInputFile?: string;
    /** Name of the output image file. */
    outputImageFile?: string;
    /** The compression quality for JPEG images (0 - 100). */
    quality?: number;
    /** Automatic stretching of the final image. */
    normalize?: boolean;
    /** Gamma correction of the final image (1.0 = unchanged). */
    gamma?: number;
    /** Clips image to black (value < 128) or white (value > 128) */
    level?: number;
    /** Resizes the image. values <= 2 represent relative scale, otherwise absolute size in pixels. */
    resize?: number;
    /** If true, expects three input images which are copied to the red, green, and blue channels. */
    channelCombine?: boolean;
    /** Automatic stretching of the individual channels. */
    channelNormalize?: boolean;
    /** Gamma correction of the individual channels (1.0 = unchanged). */
    channelGamma?: number[];
    /** Name of the RGB input image folder (for batch conversion). */
    inputImageFolder?: string;
    /** Name of the output image folder. (for batch conversion) */
    outputImageFolder?: string;
    /** Filetype to batch convert folders of images to. */
    batchConvertType?: string;
}

export type ImageMagickInstance = ToolInstance<ImageMagickTool, IImageMagickToolSettings>;

export default class ImageMagickTool extends Tool<ImageMagickTool, IImageMagickToolSettings>
{
    static readonly toolName = "ImageMagick";

    protected static readonly defaultSettings: Partial<IImageMagickToolSettings> = {
    };

    async setupInstance(instance: ImageMagickInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;
        let operation = "";

        if(settings.inputImageFolder) { // batch conversion
            const outputImagePath = instance.getFilePath(settings.outputImageFolder);
            if (!outputImagePath) {
                throw new Error("ImageMagickTool: missing output map folder");
            }

            const inputImagePath = instance.getFilePath(settings.inputImageFolder);
            if (!inputImagePath) {
                throw new Error("ImageMagickTool: missing input map folder");
            }

            if (!settings.batchConvertType) {
                throw new Error("ImageMagickTool: missing filetype to convert to");
            }

            operation = "mogrify";

            let quality = settings.quality || 70;

            if (settings.level) {
                const lvl = settings.level;
                const pct = (lvl/255*100).toFixed(2);
                operation += ` -level ${lvl <= 128 ? pct+"%" : "0,"+pct+"%"}`;
            }

            operation += ` -path "${outputImagePath}" -quality ${quality} -format ${settings.batchConvertType} "${inputImagePath}\\*.*"`;
        }
        else { // single image conversion
            const outputImagePath = instance.getFilePath(settings.outputImageFile);
            if (!outputImagePath) {
                throw new Error("ImageMagickTool: missing output map file");
            }

            operation = "convert";

            if (settings.channelCombine) {
                const redImagePath = instance.getFilePath(settings.redChannelInputFile);
                const greenImagePath = instance.getFilePath(settings.greenChannelInputFile);
                const blueImagePath = instance.getFilePath(settings.blueChannelInputFile);

                if (!redImagePath || !greenImagePath || !blueImagePath) {
                    throw new Error("ImageMagickTool.run - missing input map file");
                }

                let channelGamma = [ 1.0, 1.0, 1.0 ];
                if (Array.isArray(settings.channelGamma) && settings.channelGamma.length === 3) {
                    channelGamma = settings.channelGamma;
                }

                const channelAutoLevel = settings.channelNormalize ? "-auto-level" : "";

                operation += [
                    ` ( "${redImagePath}" ${channelAutoLevel} -gamma ${channelGamma[0]} )`,
                    ` ( "${greenImagePath}" ${channelAutoLevel} -gamma ${channelGamma[1]} )`,
                    ` ( "${blueImagePath}" ${channelAutoLevel} -gamma ${channelGamma[2]} ) -combine`,
                ].join("");
            }
            else {
                const inputImagePath = instance.getFilePath(settings.inputImageFile);
                operation += ` "${inputImagePath}"`;
            }

            let resize = settings.resize || 1.0;
            if (resize <= 2.0 && resize !== 1.0) {
                operation += ` -resize ${Math.round(resize * 100)}%`;
            }
            else if (resize !== 1.0) {
                operation += ` -resize ${Math.round(resize)}`;
            }

            if (settings.normalize === true) {
                operation += " -auto-level";
            }

            const gamma = settings.gamma || 1.0;
            if (gamma !== 1.0) {
                operation += ` -gamma ${gamma}`;
            }

            let quality = settings.quality || 70;
            if (outputImagePath.toLowerCase().endsWith("png")) {
                quality = 100;
            }
            operation += ` -quality ${quality} "${outputImagePath}"`;
        }

        const command = `"${this.configuration.executable}" ${operation}`;

        return Promise.resolve({ command });
    }
}