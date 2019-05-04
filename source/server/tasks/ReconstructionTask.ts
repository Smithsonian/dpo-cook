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

import { IRealityCaptureToolOptions } from "../tools/RealityCaptureTool";
import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[ReconstructionTask]]. */
export interface IReconstructionTaskParameters extends ITaskParameters
{
    inputImageFolderName: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Uses RealityCapture photogrammetry software to create a 3D model
 * from a set of 2D images.
 *
 * Tool: [[RealityCaptureTool]],
 * Parameters: [[IReconstructionTaskParameters]]
 */
export default class ReconstructionTask extends Task
{
    static readonly description = "Uses RealityCapture photogrammetry software to create a 3D model.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFolderName: { type: "string", minLength: 1 },
            timeout: { type: "integer", minimum: 0, default: 0 }
        },
        required: [
            "inputImageFolderName"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(ReconstructionTask.parameterSchema);

    constructor(params: IReconstructionTaskParameters, context: Job)
    {
        super(params, context);

        const toolOptions: IRealityCaptureToolOptions = {
            inputImageFolderName: params.inputImageFolderName,
            timeout: params.timeout
        };

        this.addTool("RealityCapture", toolOptions);
    }
}

