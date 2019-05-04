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

import { IImageMagickToolOptions } from "../tools/ImageMagickTool";
import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[ConvertImageTask]]. */
export interface IConvertImageTaskParameters extends ITaskParameters
{
    /** Input image file name. */
    inputImageFile: string;
    /** Output image file name. */
    outputImageFile: string;
    /** Compression quality for JPEG images (0 - 100, default: 70). */
    quality?: number;
    /** Automatic stretching of the image if true. */
    normalize?: boolean;
    /** Applies gamma correction to the final image if set (default: unset, i.e. 1.0) */
    gamma?: number;
    /** Scales the image to the given size if set (default: unset). Values <= 2 represent relative scale, otherwise absolute size in pixels. */
    resize?: number;
}

/**
 * Converts image files between different formats.
 * Applies scaling and gamma correction during conversion.
 *
 * Parameters: [[IConvertImageTaskParameters]].
 * Tool: [[ImageMagickTool]].
 */
export default class ConvertImageTask extends Task
{
    static readonly description = "Converts image files between different formats. " +
                                  "Applies scaling and gamma correction during conversion.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFile: { type: "string", minLength: 1 },
            outputImageFile: { type: "string", minLength: 1 },
            quality: { type: "integer", minimum: 0, maximum: 100, default: 70 },
            normalize: { type: "boolean", default: false },
            gamma: { type: "number", default: undefined },
            resize: { type: "number", default: undefined }
        },
        required: [
            "inputImageFile",
            "outputImageFile"
        ],
        additionalParameters: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(ConvertImageTask.parameterSchema);

    constructor(params: IConvertImageTaskParameters, context: Job)
    {
        super(params, context);

        const toolOptions: IImageMagickToolOptions = {
            inputImageFile: params.inputImageFile,
            outputImageFile: params.outputImageFile,
            quality: params.quality,
            normalize: params.normalize,
            gamma: params.gamma,
            resize: params.resize
        };

        this.addTool("ImageMagick", toolOptions);
    }
}