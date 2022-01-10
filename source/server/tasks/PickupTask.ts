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

import * as fs from "fs";
import * as path from "path";
//import {createClient} from "webdav/web";
const { createClient } = require("webdav");

import Job from "../app/Job";

import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[PickupTask]]. */
export interface IPickupTaskParameters extends ITaskParameters
{
    /** Transport method to be used. "local" uses the local file system. */
    method: "none" | "local" | "webDAV" | "dropbox";
    /** Credentials for the chosen transport method. */
    credentials?: { [id: string]: any };
    /** Path where the source files can be found. */
    path: string;
    /** Object with names of files to be copied. */
    files: { [id: string]: string };
}

/**
 * Picks files from a given location and copies them into the current work directory.
 * Method "local" supports local file copy, "webDAV" copies files from a remote server using WebDAV.
 *
 * Parameters: [[IPickupTaskParameters]]
 */
export default class PickupTask extends Task
{
    static readonly taskName = "Pickup";

    static readonly description = "Picks files from a given location and copies them into the current work directory.";

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
        Task.jsonValidator.compile(PickupTask.parameterSchema);

    constructor(params: IPickupTaskParameters, context: Job)
    {
        super(params, context);
    }

    protected async execute(): Promise<unknown>
    {
        const options = this.parameters as IPickupTaskParameters;
        const files = options.files;
        const filesToCopy = [];

        for (let prop in files) {
            if (prop !== "method" && prop !== "path") {
                if (files[prop]) {
                    filesToCopy.push(files[prop]);
                }
                else {
                    this.logTaskEvent("warning", `skipping file pickup: '${prop}' is empty/undefined`);
                }
            }
        }

        if (options.method === "none") {
            this.logTaskEvent("debug", "file pickup skipped");
            return Promise.resolve();
        }

        let remoteClient;

        if (options.method === "webDAV") {
            remoteClient = createClient(
                options.path,
                {
                    username: options.credentials.user,
                    password: options.credentials.password
                }
            );
        }

        return Promise.all(filesToCopy.map(fileName => {
            const destinationFilePath = path.resolve(this.context.jobDir, fileName);

            if (options.method === "local") {
                const sourceFilePath = path.resolve(options.path, fileName);
                return this.copyFile(sourceFilePath, destinationFilePath);
            }
            else if (options.method === "webDAV") {
                return this.copyRemoteFile(remoteClient, options.path, fileName, destinationFilePath);
            }
            else {
                throw new Error(`unsupported transport method: ${options.method}`);
            }
        }));
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

    protected copyRemoteFile(remoteClient, remoteUrl, remoteFileName: string, destinationFilePath: string): Promise<void>
    {
        this.logTaskEvent("debug", `remote copy file: '${remoteFileName}' to: '${destinationFilePath}'`);

        return remoteClient.getFileContents(remoteFileName)
            .then(buffer => {
                return new Promise((resolve, reject) => {
                    fs.writeFile(destinationFilePath, buffer, err => {
                        if (err) {
                            return reject(new Error(`failed to write file: '${destinationFilePath}', reason: ${err.message}`));
                        }

                        return resolve();
                    });
                })
            })
            .catch(err => {
                throw new Error(`failed to read remote file: '${remoteFileName}' from server '${remoteUrl}', reason: ${err.message}`);
            });
    }
}