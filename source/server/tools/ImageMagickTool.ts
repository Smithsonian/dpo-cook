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

import Tool, { IToolOptions } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IImageMagickToolOptions extends IToolOptions
{
    inputImageFile?: string;
    redChannelInputFile?: string;
    greenChannelInputFile?: string;
    blueChannelInputFile?: string;
    outputImageFile: string;
    /** The compression quality for JPEG images (0 - 100). */
    quality?: number;
    /** Automatic stretching of the final image. */
    normalize?: boolean;
    /** Gamma correction of the final image (1.0 = unchanged). */
    gamma?: number;
    /** Resizes the image. values <= 2 represent relative scale, otherwise absolute size in pixels. */
    resize?: number;
    /** If true, expects three input images which are copied to the red, green, and blue channels. */
    channelCombine?: boolean;
    /** Automatic stretching of the individual channels. */
    channelNormalize?: boolean;
    /** Gamma correction of the individual channels (1.0 = unchanged). */
    channelGamma?: number[];
}

export default class ImageMagickTool extends Tool
{
    static readonly type: string = "ImageMagickTool";

    protected static readonly defaultOptions: Partial<IImageMagickToolOptions> = {
    };

    run(): Promise<void>
    {
        const options = this.options as IImageMagickToolOptions;

        const outputImagePath = this.getFilePath(options.outputImageFile);
        if (!outputImagePath) {
            throw new Error("ImageMagickTool: missing output map file");
        }

        let operation = "convert";

        if (options.channelCombine) {
            const redImagePath = this.getFilePath(options.redChannelInputFile);
            const greenImagePath = this.getFilePath(options.greenChannelInputFile);
            const blueImagePath = this.getFilePath(options.blueChannelInputFile);

            if (!redImagePath || !greenImagePath || !blueImagePath) {
                throw new Error("ImageMagickTool.run - missing input map file");
            }

            let channelGamma = [ 1.0, 1.0, 1.0 ];
            if (Array.isArray(options.channelGamma) && options.channelGamma.length === 3) {
                channelGamma = options.channelGamma;
            }

            const channelAutoLevel = options.channelNormalize ? "-auto-level" : "";

            operation += [
                ` ( "${redImagePath}" ${channelAutoLevel} -gamma ${channelGamma[0]} )`,
                ` ( "${greenImagePath}" ${channelAutoLevel} -gamma ${channelGamma[1]} )`,
                ` ( "${blueImagePath}" ${channelAutoLevel} -gamma ${channelGamma[2]} ) -combine`,
            ].join("");
        }
        else {
            const inputImagePath = this.getFilePath(options.inputImageFile);
            operation += ` "${inputImagePath}"`;
        }

        let resize = options.resize || 1.0;
        if (resize <= 2.0 && resize !== 1.0) {
            operation += ` -resize ${Math.round(resize * 100)}%`;
        }
        else if (resize !== 1.0) {
            operation += ` -resize ${Math.round(resize)}`;
        }

        if (options.normalize === true) {
            operation += " -auto-level";
        }

        const gamma = options.gamma || 1.0;
        if (gamma !== 1.0) {
            operation += ` -gamma ${gamma}`;
        }

        let quality = options.quality || 70;
        if (outputImagePath.toLowerCase().endsWith("png")) {
            quality = 100;
        }
        operation += ` -quality ${quality} "${outputImagePath}"`;

        const command = `"${this.configuration.executable}" ${operation}`;
        return this.waitInstance(command);
    }
}