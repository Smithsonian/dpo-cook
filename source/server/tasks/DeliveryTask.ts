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
import * as webDAV from "webdav";

import Job from "../app/Job";

import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[DeliveryTask]]. */
export interface IDeliveryTaskParameters extends ITaskParameters
{
    /** Transport method to be used. "local" uses the local file system. */
    method: "none" | "local" | "webDAV" | "dropbox";
    /** Credentials for the chosen transport method.
     *  local: {}, webDAV: { user, password }
     */
    credentials?: { [id: string]: any };
    /** Path where the files should be copied to. */
    path: string;
    /** Object with names of files to be copied. */
    files: { [id: string]: string };
}

/**
 * Delivers files to a given destination. Copies the files from the current work directory.
 * Method "local" supports local file copy, "webDAV" copies files to a remote server using WebDAV.
 *
 * Parameters: [[IDeliveryTaskParameters]]
 */
export default class DeliveryTask extends Task
{
    static readonly description = "Delivers files to a given destination.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            "method": {
                type: "string",
                enum: [ "none", "local", "webDAV", "dropbox" ],
                default: "none"
            },
            "credentials": { type: "object" },
            "path": { type: "string", minLength: 1 },
            "files": { type: "object", additionalProperties: { type: "string" }}
        },
        required: [
            "method",
            "path",
            "files"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(DeliveryTask.parameterSchema);

    constructor(params: IDeliveryTaskParameters, context: Job)
    {
        super(params, context);
    }

    run(): Promise<void>
    {
        this.startTask();

        const params = this.parameters as IDeliveryTaskParameters;
        const files = params.files;

        const filesToCopy = [];
        const fileMap = {};

        for (let prop in files) {
            if (files[prop]) {
                filesToCopy.push(files[prop]);
                fileMap[prop] = files[prop];
            }
            else {
                this.logTaskEvent("warning", `skipping file delivery: '${prop}' is empty/undefined`);
            }
        }

        this.report.result.files = fileMap;

        if (params.method === "none") {
            this.logTaskEvent("debug", "file delivery skipped");
            this.endTask(null, "done");
            return Promise.resolve();
        }

        let remoteClient;

        if (params.method === "webDAV") {
            remoteClient = webDAV(
                params.path,
                params.credentials.user,
                params.credentials.password
            );
        }

        if (filesToCopy.length === 0) {
            this.logTaskEvent("debug", "files array is empty, nothing to deliver");
        }

        return Promise.all(filesToCopy.map(fileName => {
            const sourceFilePath = path.resolve(this.context.jobDir, fileName);

            if (params.method === "local") {
                const destinationFilePath = path.resolve(params.path, fileName);
                return this.copyFile(sourceFilePath, destinationFilePath);
            }
            else if (params.method === "webDAV") {
                return this.copyRemoteFile(remoteClient, params.path, fileName, sourceFilePath);
            }
            else {
                throw new Error(`unsupported transport method: ${params.method}`);
            }
        })).then(() => {
            this.endTask(null, "done");
        }).catch(err => {
            this.endTask(err, "error");
            throw err;
        });
    }

    protected copyFile(sourceFilePath: string, destinationFilePath: string): Promise<void>
    {
        return new Promise((resolve, reject) => {
            this.logTaskEvent("debug", `copy file: '${sourceFilePath}' to: '${destinationFilePath}'`);

            fs.copyFile(sourceFilePath, destinationFilePath, err => {
                if (err) {
                    return reject(new Error(`failed to copy file: '${sourceFilePath}' ` +
                        `to '${destinationFilePath}', reason: ${err.code} (${err.errno})`));
                }

                return resolve();
            });
        });
    }

    protected copyRemoteFile(remoteClient, remoteUrl, remoteFileName: string, sourceFilePath: string): Promise<void>
    {
        return new Promise((resolve, reject) => {
            this.logTaskEvent("debug", `remote copy file: '${sourceFilePath}' to: '${remoteFileName}'`);

            fs.readFile(sourceFilePath, (err, buffer) => {
                if (err) {
                    return reject(new Error(`failed to read file: '${sourceFilePath}', reason: ${err.message}`));
                }

                remoteClient.putFileContents(remoteFileName, buffer)
                    .then(() => {
                        return resolve();
                    })
                    .catch(err => {
                        return reject(new Error(`failed to write remote file: '${remoteFileName}' from server '${remoteUrl}', reason: ${err.message}`));
                    })
            });
        });
    }
}