/**
 * 3D Foundation Project
 * Copyright 2025 Smithsonian Institution
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

import { IRapidCompactToolSettings } from "../tools/RapidCompactTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[CompressTexturesTask]]. */
export interface ICompressTexturesTaskParameters extends ITaskParameters
{
    /** Input image file name. */
    inputMeshFile: string;
    /** Output image file name. */
    outputMeshFile: string;
    /** Compression format to use (etc1s, uastc). */
    format: string;
    /** Compression quality for JPEG images (0 - 100, default: 70). */
    quality?: number;
}

/**
 * Compresss image texture files for GPU optimization.
 *
 * Parameters: [[ICompressTexturesTaskParameters]].
 * Tool: [[RapidCompact]].
 */
export default class CompressTexturesTask extends ToolTask
{
    static readonly taskName = "CompressTextures";

    static readonly description = "Compresss image texture files for GPU optimization.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            quality: { type: "integer", minimum: 0, maximum: 100, default: 70 },
            format: { type: "string", default: "etc1s"}
        },
        required: [
            "inputMeshFile"
        ],
        additionalParameters: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(CompressTexturesTask.parameterSchema);

    constructor(params: ICompressTexturesTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IRapidCompactToolSettings = {
            inputMeshFile: params.inputMeshFile,
            mode: "tex-compress",
            texCompressionFormat: params.format
        };

        this.addTool("RapidCompact", settings);
    }
}