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

import Job from "../app/Job";

import ImageMagickTool, { IImageMagickToolSettings } from "../tools/ImageMagickTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask, { ToolInstance } from "../app/ToolTask";
import { promises as fs } from "fs";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[SplitImageChannelsTask]]. */
export interface ISplitImageChannelsTaskParameters extends ITaskParameters
{
    /** Map input file to pull red channel from. */
    redChannelMapFile: string;
    /** Map input file to pull green channel from. */
    greenChannelMapFile: string;
    /** Map input file to pull blue channel from. */
    blueChannelMapFile: string;
    /** Map input file to pull alpha channel from. */
    alphaChannelMapFile: string;
    /** Combined map input file. */
    inputMapFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Split channels from single image into separate maps.
 * 
 * Parameters: [[ISplitImageChannelsTaskParameters]].
 * Tool: [[ImageMagickTool]].
 */
export default class SplitImageChannelsTask extends ToolTask
{
    static readonly taskName = "SplitImageChannels";

    static readonly description = "Split channels from single image into separate maps.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            redChannelMapFile: { type: "string", minLength: 1 },
            greenChannelMapFile: { type: "string", minLength: 1 },
            blueChannelMapFile: { type: "string", minLength: 1 },
            alphaChannelMapFile: { type: "string", minLength: 1 },
            inputMapFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", minimum: 0, default: 0 }
        },
        required: [
            "inputMapFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(SplitImageChannelsTask.parameterSchema);

    constructor(params: ISplitImageChannelsTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IImageMagickToolSettings = {
            redChannelInputFile: params.redChannelMapFile,
            greenChannelInputFile: params.greenChannelMapFile,
            blueChannelInputFile: params.blueChannelMapFile,
            alphaChannelInputFile: params.alphaChannelMapFile,
            inputImageFile: params.inputMapFile,
            quality: 80,
            normalize: false,
            channelSplit: true,
            timeout: params.timeout
        };

        this.addTool("ImageMagick", settings);
    }

    protected async instanceDidExit(instance: ToolInstance)
    {
        if (instance.tool instanceof ImageMagickTool) {

            const settings = instance.settings as IImageMagickToolSettings;
            const filename = settings.inputImageFile.split(".");
            let fileCount = 0;
            const inputImages = [settings.redChannelInputFile, settings.greenChannelInputFile, 
                settings.blueChannelInputFile, settings.alphaChannelInputFile]


            for(let i=0; i<inputImages.length; i++) {
                if(inputImages[i]) {
                    const tempName = filename[0] + "_" + fileCount + "." + filename[1];
    
                    await fs.rename(instance.getFilePath(tempName), instance.getFilePath(inputImages[i]))
                        .catch((error) => {throw new Error(`could not rename [${inputImages[i]}] channel file. `+error);});
    
                    fileCount++;
                }
            };
        }

        return Promise.resolve();
    }
}