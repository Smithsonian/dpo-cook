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

/** Parameters for [[GenerateSpriteMapTask]]. */
export interface IGenerateSpriteMapTaskParameters extends ITaskParameters
{
    /** Input image file name. */
    inputImageFolder: string;
    /** Output image file name. */
    outputImageFile: string;
    /** Compression quality for JPEG images (0 - 100, default: 70). */
    quality?: number;
    /** Scales the image to the given size if set (default: unset). Values <= 2 represent relative scale, otherwise absolute size in pixels. */
    resize?: number;
    /** Horizontal dimensions of desired sprite map */
    dimensionX?: number;
    /** Vertical dimensions of desired sprite map */
    dimensionY?: number;
}

/**
 * Generate a sprite map from a folder of images
 *
 * Parameters: [[IGenerateSpriteMapTaskParameters]].
 * Tool: [[ImageMagickTool]].
 */
export default class GenerateSpriteMapTask extends ToolTask
{
    static readonly taskName = "GenerateSpriteMap";

    static readonly description = "Generate a sprite map from a folder of images. " +
                                  "Applies scaling during conversion.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFolder: { type: "string", minLength: 1 },
            outputImageFile: { type: "string", minLength: 1 },
            quality: { type: "integer", minimum: 0, maximum: 100, default: 70 },
            resize: { type: "number", default: undefined },
            dimensionX: { type: "integer", minimum: 0 },
            dimensionY: { type: "integer", minimum: 0 }
        },
        required: [
            "inputImageFolder",
            "outputImageFile"
        ],
        additionalParameters: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(GenerateSpriteMapTask.parameterSchema);

    constructor(params: IGenerateSpriteMapTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IImageMagickToolSettings = {
            inputImageFolder: params.inputImageFolder,
            outputImageFile: params.outputImageFile,
            quality: params.quality,
            resize: params.resize,
            layoutX: params.dimensionX,
            layoutY: params.dimensionY
        };

        this.addTool("ImageMagick", settings);
    }
}