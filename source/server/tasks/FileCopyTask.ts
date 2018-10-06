/**
 * 3D Foundation Project
 * Copyright 2018 Smithsonian Institution
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

import * as fs from "fs";
import * as path from "path";

import Job from "../app/Job";

import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[FileCopyTask]]. */
export interface IFileCopyTaskParameters extends ITaskParameters
{
    /** Source directory path. */
    sourcePath: string;
    /** Destination directory path. */
    destinationPath: string;
    /** Names of files to be copied. */
    files: string[];
}

/**
 * Copies files from the source directory to the destination directory.
 *
 * Parameters: [[IFileCopyTaskParameters]]
 */
export default class FileCopyTask extends Task
{
    static readonly description = "Copies files from the source directory to the destination directory.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            "sourcePath": { type: "string", minLength: 1 },
            "destinationPath": { type: "string", minLength: 1 },
            "files": {
                type: "array",
                items: { type: "string", minLength: 1 }
            }
        },
        required: [
            "sourcePath",
            "destinationPath",
            "files"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(FileCopyTask.parameterSchema);

    constructor(params: IFileCopyTaskParameters, context: Job)
    {
        super(params, context);
    }

    run(): Promise<void>
    {
        this.startTask();

        const options = this.parameters as IFileCopyTaskParameters;

        return Promise.all(options.files.map(fileName => {
            const sourceFilePath = path.resolve(options.sourcePath, fileName);
            const destinationFilePath = path.resolve(options.destinationPath, fileName);
            return this.copyFile(sourceFilePath, destinationFilePath);
        })).then(() => {
            this.endTask(null, "done");
        }).catch(err => {
            this.endTask(err, "error");
            throw err;
        });
    }

    protected copyFile(sourceFilePath: string, destinationFilePath: string): Promise<void>
    {
        this.logTaskEvent("debug", `Copy file: ${sourceFilePath} to: ${destinationFilePath}`);

        return new Promise((resolve, reject) => {
            fs.copyFile(sourceFilePath, destinationFilePath, err => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });
    }
}