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

import * as fs from "fs-extra";
import * as fetch from "node-fetch";

import * as JSONValidator from "ajv";
import { Ajv } from "ajv";


import { Dictionary } from "@ff/core/types";
import { IJobOrder, IRecipe, IJobInfo, IJobReport, TTaskState } from "../common/types";

////////////////////////////////////////////////////////////////////////////////

export default class ApiClient
{
    protected machineAddress: string = "localhost:8000";
    protected clientId: string;
    protected jsonValidator: Ajv;

    constructor(machineAddress: string, clientId: string)
    {
        this.machineAddress = machineAddress;
        this.clientId = clientId;

        this.jsonValidator = new JSONValidator({ allErrors: true, verbose: true });
        this.jsonValidator.addFormat("file", value => true);
    }

    get clientPath() {
        return this.machineAddress + "/clients/" + this.clientId;
    }

    async fetchJson(endpoint: string, method: string, data?: any): Promise<any>
    {
        return fetch(endpoint, {
            method,
            body: JSON.stringify(data),
            headers: { "Content-Type": "application/json" }
        })
        .then(result => {
            if (result.ok) {
                return result.json();
            }
            else {
                throw new Error(`HTTP error ${result.status}: ${result.statusText}`);
            }
        });
    }

    async createJob(jobId: string, recipeId: string, parameters: Dictionary<string>): Promise<void>
    {
        const data: IJobOrder = {
            id: jobId,
            name: "cli",
            clientId: this.clientId,
            recipeId,
            parameters,
            priority: "normal",
            submission: new Date().toISOString()
        };

        return this.fetchJson(this.machineAddress + "/job", "POST", data)
    }

    async createJobUploadFiles(jobId: string, recipeId: string, parameters: Dictionary<string>): Promise<any>
    {
        return this.getRecipe(recipeId)
            .then(recipe => {
                this.validateParameters(recipe, parameters);
                return this.extractFiles(recipe, parameters);
            })
            .then(files => this.createJob(jobId, recipeId, parameters)
            .then(() => this.waitCreated(jobId))
            .then(() => this.uploadFiles(jobId, files)));
    }

    async waitFetchResultFiles(jobId: string): Promise<any>
    {
        return this.waitDone(jobId)
            .then(() => this.fetchResultFiles(jobId));
    }

    async fetchResultFiles(jobId: string): Promise<any>
    {
        return this.jobReport(jobId).then(report => {
            if (report.state !== "done") {
                throw new Error("can only fetch files after job is done");
            }

            const deliveryStep = report.steps["delivery"];
            if (!deliveryStep) {
                throw new Error("job has no delivery step");
            }

            const fileMap = deliveryStep.result["files"];
            if (!fileMap) {
                throw new Error("job delivery contains no files");
            }

            const files = Object.keys(fileMap).map(key => fileMap[key]);
            return this.downloadFiles(jobId, files);
        });
    }

    async waitCreated(jobId: string): Promise<void>
    {
        console.log("waiting for job creation...");

        return new Promise((resolve, reject) => {
            const timeoutHandler = setTimeout(() => {
                clearInterval(intervalHandler);
                reject(new Error("timeout while waiting for job creation"));
            }, 5000);

            const intervalHandler = setInterval(() => {
                this.jobInfo(jobId).then(info => {
                    if (info.state === "created") {
                        clearInterval(intervalHandler);
                        clearTimeout(timeoutHandler);
                        resolve();
                    }
                }).catch(() => {});
            }, 1000);
        });
    }

    async waitDone(jobId: string): Promise<TTaskState>
    {
        console.log("waiting for job completion...");

        return new Promise((resolve, reject) => {
            const handler = setInterval(() => {
                this.jobInfo(jobId).then(info => {
                    if (info.state !== "created" && info.state !== "waiting" && info.state !== "running") {
                        clearInterval(handler);
                        resolve(info.state);
                    }
                }).catch(error => {
                    clearInterval(handler);
                    reject(error);
                });
            }, 2000);
        });
    }

    validateParameters(recipe: IRecipe, parameters: Dictionary<string>)
    {
        if (!this.jsonValidator.validate(recipe.parameterSchema, parameters)) {
            throw new Error(
                "invalid parameters; " +
                this.jsonValidator.errorsText(null, { separator: ", ", dataVar: "parameters" })
            );
        }
    }

    extractFiles(recipe: IRecipe, parameters: Dictionary<string>): string[]
    {
        const files = [];

        for (const key in parameters) {
            const schema = recipe.parameterSchema.properties[key];
            if (schema.format && schema.format === "file") {
                files.push(parameters[key]);
            }
        }

        return files;
    }

    async uploadFiles(jobId: string, filePaths: string[])
    {
        return Promise.all(filePaths.map(path => this.uploadFile(jobId, path)));
    }

    async uploadFile(jobId: string, filePath: string): Promise<void>
    {
        if (!fs.existsSync(filePath)) {
            console.log(`skipping upload, file not existing: ${filePath}`);
            return Promise.resolve();
        }

        const stream = fs.createReadStream(filePath);
        const endpoint = this.machineAddress + "/" + jobId + "/" + filePath;

        console.log(`uploading file: ${filePath}`);

        return fetch(endpoint, {
            method: "PUT",
            body: stream
        });
    }

    async downloadFiles(jobId: string, filePaths: string[])
    {
        return Promise.all(filePaths.map(path => this.downloadFile(jobId, path)));
    }

    async downloadFile(jobId: string, filePath: string)
    {
        const endpoint = this.machineAddress + "/" + jobId + "/" + filePath;

        console.log(`downloading file: ${filePath}`);

        return fetch(endpoint)
            .then(result => {
                const stream = fs.createWriteStream(filePath);
                result.body.pipe(stream);
            });
    }

    async runJob(jobId: string): Promise<void>
    {
        return this.fetchJson(this.clientPath + "/jobs/" + jobId + "/run", "PATCH");
    }

    async cancelJob(jobId: string): Promise<void>
    {
        return this.fetchJson(this.clientPath + "/jobs/" + jobId + "/cancel", "PATCH");
    }

    async deleteJob(jobId: string): Promise<void>
    {
        return this.fetchJson(this.clientPath + "/jobs/" + jobId, "DELETE");
    }

    async jobInfo(jobId: string): Promise<IJobInfo>
    {
        return this.fetchJson(this.clientPath + "/jobs/" + jobId, "GET");
    }

    async jobReport(jobId: string): Promise<IJobReport>
    {
        return this.fetchJson(this.clientPath + "/jobs/" + jobId + "/report", "GET");
    }

    async listJobs(): Promise<void>
    {
        return this.fetchJson(this.clientPath + "/jobs", "GET");
    }

    async listRecipes(): Promise<void>
    {
        return this.fetchJson(this.machineAddress + "/recipes", "GET");
    }

    async getRecipe(recipeId: string): Promise<IRecipe>
    {
        return this.fetchJson(this.machineAddress + "/recipes/" + recipeId, "GET");
    }

    async machineInfo(): Promise<void>
    {
        return this.fetchJson(this.machineAddress + "/machine", "GET");
    }
}