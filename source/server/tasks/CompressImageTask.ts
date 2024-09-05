/**
 * 3D Foundation Project
 * Copyright 2024 Smithsonian Institution
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

import { IKTXToolSettings } from "../tools/KTXTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[CompressImageTask]]. */
export interface ICompressImageTaskParameters extends ITaskParameters
{
    /** Input image file name. */
    inputImageFile: string;
    /** Output image file name. */
    outputImageFile: string;
    /** Compression quality for JPEG images (0 - 100, default: 70). */
    quality?: number;
}

/**
 * Compresss image texture files for GPU optimization.
 *
 * Parameters: [[ICompressImageTaskParameters]].
 * Tool: [[KTXTool]].
 */
export default class CompressImageTask extends ToolTask
{
    static readonly taskName = "CompressImage";

    static readonly description = "Compresss image texture files for GPU optimization.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFile: { type: "string", minLength: 1 },
            outputImageFile: { type: "string", minLength: 1 },
            quality: { type: "integer", minimum: 0, maximum: 100, default: 70 },
        },
        required: [
            "inputImageFile",
            "outputImageFile"
        ],
        additionalParameters: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(CompressImageTask.parameterSchema);

    constructor(params: ICompressImageTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IKTXToolSettings = {
            inputImageFile: params.inputImageFile,
            outputImageFile: params.outputImageFile,
        };

        this.addTool("KTX-Software", settings);
    }
}