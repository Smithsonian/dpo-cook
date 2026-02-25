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

import { IPostShotToolSettings } from "../tools/PostShotTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";


////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[RadianceFieldTask]] */
export interface IRadianceFieldTaskParameters extends ITaskParameters
{
    /** Input image folder. */
    inputImageFolder: string;
    /** Base name used for output files */
    outputFile: string;
    /** Name used for saved camera position file */
    camerasFile: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Tool to use for radiance field generation ("PostShot", default: "PostShot"). */
    tool?: "PostShot";
}

/**
 * Generates a radiance field from an image set
 *
 * Parameters: [[IRadianceFieldTaskParameters]]
 * Tools: [[PostShotTool]], 
 */
export default class RadianceFieldTask extends ToolTask
{
    static readonly taskName = "RadianceField";

    static readonly description = "Generates a mesh and texture from an image set using photogrammetry techniques.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFolder: { type: "string", minLength: 1 },
            outputFile: { type: "string", minLength: 1 },
            camerasFile: { type: "string", minLength: 1 },
            timeout: { type: "integer", default: 0 },
            tool: { type: "string", enum: [ "PostShot" ], default: "PostShot" }
        },
        required: [
            "inputImageFolder",
            "outputFile",
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(RadianceFieldTask.parameterSchema);

    constructor(params: IRadianceFieldTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "PostShot") {
            const toolOptions: IPostShotToolSettings = {
                imageInputFolder: params.inputImageFolder,
                outputFile: params.outputFile,
                camerasFile: params.camerasFile,
                timeout: params.timeout
            };

            this.addTool("PostShot", toolOptions);
        }
        else {
            throw new Error("RadianceFieldTask.constructor - unknown tool: " + params.tool);
        }
    }
}