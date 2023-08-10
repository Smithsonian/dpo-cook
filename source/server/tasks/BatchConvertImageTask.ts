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

/** Parameters for [[BatchConvertImageTask]]. */
export interface IBatchConvertImageTaskParameters extends ITaskParameters
{
    /** Input image folder path. */
    inputImageFolder: string;
    /** Output image folder path. */
    outputImageFolder: string;
    /** Compression quality for JPEG images (0 - 100, default: 70). */
    quality?: number;
    /** Filetype to convert images to. */
    filetype?: string;
}

/**
 * Converts folders image files between different formats.
 *
 * Parameters: [[IBatchConvertImageTaskParameters]].
 * Tool: [[ImageMagickTool]].
 */
export default class BatchConvertImageTask extends ToolTask
{
    static readonly taskName = "BatchConvertImage";

    static readonly description = "Converts folders image files between different formats. ";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFolder: { type: "string", minLength: 1 },
            outputImageFolder: { type: "string", minLength: 1 },
            quality: { type: "integer", minimum: 0, maximum: 100, default: 70 },
            filetype: { type: "string", default: "jpg" }
        },
        required: [
            "inputImageFolder",
            "outputImageFolder",
            "filetype"
        ],
        additionalParameters: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(BatchConvertImageTask.parameterSchema);

    constructor(params: IBatchConvertImageTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IImageMagickToolSettings = {
            inputImageFolder: params.inputImageFolder,
            outputImageFolder: params.outputImageFolder,
            quality: params.quality,
            batchConvertType: params.filetype
        };

        this.addTool("ImageMagick", settings);
    }
}