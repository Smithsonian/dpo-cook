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

import { ISevenZipToolSettings } from "../tools/SevenZipTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[ZipTask]]. */
export interface IZipTaskParameters extends ITaskParameters
{
    /** Array of file names to be zipped. */
    inputFile1: string;
    inputFile2?: string;
    inputFile3?: string;
    inputFile4?: string;
    inputFile5?: string;
    /** The type of zip operation we want to do. */
    operation?: "zip" | "unzip";
    /** Name to give generated zip file. */
    outputFile?: string;
    /** Degree of compression */
    compressionLevel?,
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Default tool is 7Zip. Specify another tool if needed. */
    tool?: "SevenZip";
}

/**
 * Executes zip operation on a set of up to 5 files.
 *
 * Parameters: [[IZipTaskParameters]].
 */
export default class ZipTask extends ToolTask
{
    static readonly taskName = "Zip";

    static readonly description = "Executes zip operations on a set of up to 5 files.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputFile1: { type: "string", minLength: 1 },
            inputFile2: { type: "string", minLength: 1 },
            inputFile3: { type: "string", minLength: 1 },
            inputFile4: { type: "string", minLength: 1 },
            inputFile5: { type: "string", minLength: 1 },
            operation: { type: "string", enum: [ "zip", "unzip" ] },
            outputFile: { type: "string", minLength: 1, default: "CookArchive.zip" },
            compressionLevel: { type: "integer", minimum: 0, default: 5 },
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: { type: "string", enum: [ "SevenZip" ], default: "SevenZip" }
        },
        required: [
            "inputFile1"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(ZipTask.parameterSchema);

    constructor(params: IZipTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "SevenZip") {
            const settings: ISevenZipToolSettings = {
                inputFile1: params.inputFile1,
                inputFile2: params.inputFile2,
                inputFile3: params.inputFile3,
                inputFile4: params.inputFile4,
                inputFile5: params.inputFile5,
                compressionLevel: params.compressionLevel,
                operation: params.operation,
                outputFile: params.outputFile,
                timeout: params.timeout
            };

            this.addTool("SevenZip", settings);
        }     
    }
}