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

import Job from "../app/Job";

import { IImageMagickToolSettings } from "../tools/ImageMagickTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[MergeImageChannelsTask]]. */
export interface IMergeImageChannelsTaskParameters extends ITaskParameters
{
    /** Map input file to pull red channel from. */
    redChannelMapFile: string;
    /** Map input file to pull green channel from. */
    greenChannelMapFile: string;
    /** Map input file to pull blue channel from. */
    blueChannelMapFile: string;
    /** Map input file to pull alpha channel from. */
    alphaChannelMapFile: string;
    /** Combined map output file. */
    outputMapFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Combines channels from separate maps into one combined map.
 * 
 * Parameters: [[IMergeImageChannelsTaskParameters]].
 * Tool: [[ImageMagickTool]].
 */
export default class MergeImageChannelsTask extends ToolTask
{
    static readonly taskName = "MergeImageChannels";

    static readonly description = "Combines channels from separate maps into one combined map.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            redChannelMapFile: { type: "string", minLength: 1 },
            greenChannelMapFile: { type: "string", minLength: 1 },
            blueChannelMapFile: { type: "string", minLength: 1 },
            alphaChannelMapFile: { type: "string", minLength: 1 },
            outputMapFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", minimum: 0, default: 0 }
        },
        required: [
            "redChannelMapFile",
            "greenChannelMapFile",
            "blueChannelMapFile",
            "outputMapFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(MergeImageChannelsTask.parameterSchema);

    constructor(params: IMergeImageChannelsTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IImageMagickToolSettings = {
            redChannelInputFile: params.redChannelMapFile,
            greenChannelInputFile: params.greenChannelMapFile,
            blueChannelInputFile: params.blueChannelMapFile,
            alphaChannelInputFile: params.alphaChannelMapFile,
            outputImageFile: params.outputMapFile,
            quality: 80,
            normalize: false,
            channelCombine: true,
            timeout: params.timeout
        };

        this.addTool("ImageMagick", settings);
    }
}