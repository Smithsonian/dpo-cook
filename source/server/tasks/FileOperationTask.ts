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
import * as mkdirp from "mkdirp";
import * as rimraf from "rimraf";

import Job from "../app/Job";

import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[FileOperationTask]]. */
export interface IFileOperationTaskParameters extends ITaskParameters
{
    /** Operation to be performed. */
    operation: "DeleteFile" | "RenameFile" | "CreateFolder" | "DeleteFolder";
    /** Name of the file the operation should be performed on. */
    name: string;
    /** For "RenameFile" only: new file name. */
    newName?: string;
}

/**
 * Executes file operations including delete, rename, create folder,
 * and delete folder.
 *
 * Parameters: [[IFileOperationTaskParameters]].
 */
export default class FileOperationTask extends Task
{
    static readonly description = "Executes file system operations including " +
                                  "delete, rename, create folder and delete folder";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            operation: { type: "string", enum: [ "DeleteFile", "RenameFile", "CreateFolder", "DeleteFolder" ]},
            name: { type: "string", minLength: 1 },
            newName: { type: "string", minLength: 1, default: "" }
        },
        required: [
            "operation",
            "name"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(FileOperationTask.parameterSchema);

    constructor(params: IFileOperationTaskParameters, context: Job)
    {
        super(params, context);
    }

    run(): Promise<void>
    {
        return new Promise((resolve, reject) => {

            this.startTask();
            const params = this.parameters as IFileOperationTaskParameters;
            const filePath = path.resolve(this.context.jobDir, params.name);

            switch(params.operation) {
                case "DeleteFile":
                    fs.unlink(filePath, err => {
                        if (err) {
                            err = new Error(`Delete file "${filePath}" failed: ${err.toString()}`);
                            this.endTask(err, "error");
                            return reject(err);
                        }

                        this.logTaskEvent("debug", `Successfully deleted file "${filePath}"`);
                        this.endTask(null, "done");
                        return resolve();
                    });
                    break;

                case "RenameFile":
                    if (!params.newName) {
                        return reject("Rename file operation requires 'newName' parameter to be set.");
                    }
                    const newFilePath = path.resolve(this.context.jobDir, params.newName);
                    mkdirp(path.dirname(newFilePath), err => {
                        if (err) {
                            err = new Error(`Rename file "${filePath}" failed: ${err.toString()}`);
                            this.endTask(err, "error");
                            return reject(err);
                        }

                        fs.rename(filePath, newFilePath, err => {
                            if (err) {
                                err = new Error(`Rename file "${filePath}" failed: ${err.toString()}`);
                                this.endTask(err, "error");
                                return reject(err);
                            }

                            this.logTaskEvent("debug", `Successfully renamed file "${filePath}" to "${newFilePath}"`);
                            this.endTask(null, "done");
                            return resolve();
                        });
                    });
                    break;

                case "CreateFolder":
                    mkdirp(filePath, err => {
                        if (err) {
                            err = new Error(`Create folder "${filePath}" failed: ${err.toString()}`);
                            this.endTask(err, "error");
                            return reject(err);
                        }

                        this.logTaskEvent("debug", `Successfully created folder "${filePath}"`);
                        this.endTask(null, "done");
                        return resolve();
                    });
                    break;

                case "DeleteFolder":
                    if (filePath.length < 4) {
                        const err = new Error(`deletion of folder "${filePath}" refused.`);
                        this.endTask(err, "error");
                        reject(err);
                    }

                    rimraf(filePath, err => {
                        if (err) {
                            err = `Delete folder "${filePath}" failed: ${err.toString()}`;
                            this.endTask(err, "error");
                            return reject(err);
                        }

                        this.logTaskEvent("debug", `Successfully deleted folder "${filePath}"`);
                        this.endTask(null, "done");
                        return resolve();
                    });
                    break;
            }
        });
    }
}