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

import Job from "../app/Job";

import { IImageMagickToolSettings } from "../tools/ImageMagickTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[CombineOcclusionTask]]. */
export interface ICombineOcclusionTaskParameters extends ITaskParameters
{
    /** Large scale occlusion map input file. */
    largeMapFile: string;
    /** Medium scale occlusion map input file. */
    mediumMapFile: string;
    /** Small scale occlusion map input file. */
    smallMapFile: string;
    /** Combined occlusion map output file. */
    outputMapFile: string;
    /** Gamma correction values for large, medium and small channels (default: [1, 0.1, 0.0]). */
    channelGamma?: number[];
}

/**
 * Combines 3 separate occlusion maps into one combined map.
 * Applies individual gamma correction to each of the 3 map channels.
 * - Large scale map > red channel.
 * - Medium scale map > green channel.
 * - Small scale map > blue channel.
 *
 * Parameters: [[ICombineOcclusionTaskParameters]].
 * Tool: [[ImageMagickTool]].
 */
export default class CombineOcclusionTask extends ToolTask
{
    static readonly taskName = "CombineOcclusion";

    static readonly description = "Combines 3 separate occlusion maps into one combined map.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            largeMapFile: { type: "string", minLength: 1 },
            mediumMapFile: { type: "string", minLength: 1 },
            smallMapFile: { type: "string", minLength: 1 },
            outputMapFile: { type: "string", minLength: 1 },
            channelGamma: {
                type: "array",
                items: { type: "number" },
                minItems: 3,
                maxItems: 3,
                default: [ 1.0, 0.1, 0.05 ]
            }
        },
        required: [
            "largeMapFile",
            "mediumMapFile",
            "smallMapFile",
            "outputMapFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(CombineOcclusionTask.parameterSchema);

    constructor(params: ICombineOcclusionTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IImageMagickToolSettings = {
            redChannelInputFile: params.largeMapFile,
            greenChannelInputFile: params.mediumMapFile,
            blueChannelInputFile: params.smallMapFile,
            outputImageFile: params.outputMapFile,
            quality: 70,
            normalize: true,
            channelCombine: true,
            channelGamma: params.channelGamma || [ 1.0, 0.1, 0.05 ]
        };

        this.addTool("ImageMagick", settings);
    }
}