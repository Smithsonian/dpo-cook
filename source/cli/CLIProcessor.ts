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
import * as minimist from "minimist";
import * as table from "markdown-table";

import { Dictionary } from "@ff/core/types";
import { IRecipe } from "../common/types";

import ApiClient from "./APIClient";

////////////////////////////////////////////////////////////////////////////////

export default class CLIProcessor
{
    static readonly clientIdFilePath: string = path.resolve(__dirname, ".cook-cli-client");
    static readonly machineAddressFilePath: string = path.resolve(__dirname, ".cook-cli-machine");

    protected clientId: string = "";
    protected machineAddress: string = "";

    constructor()
    {
    }

    execute(argv: string[])
    {
        const args = minimist(argv.slice(2));

        const command = args._[0];
        const arg0 = args._[1];
        const arg1 = args._[2];
        const arg2 = args._[3];

        try {
            switch (command) {
                case "help":
                    this.printHelp();
                    return process.exit(0);

                case "machine":
                    if (arg0) {
                        this.setMachineAddress(arg0);
                    } else {
                        console.log(this.getMachineAddress());
                    }
                    return process.exit(0);

                case "client":
                    if (arg0) {
                        this.setClientId(arg0);
                    } else {
                        console.log(this.getClientId());
                    }
                    return process.exit(0);
            }

            const api = new ApiClient(this.getMachineAddress(), this.getClientId());

            switch (command) {
                case "create":
                    api.createJobUploadFiles(arg0, arg1, this.parseParameters(args, arg2))
                        .catch(error => this.logError("create job", error));
                    return;

                case "run":
                    if (arg1) {
                        api.createJobUploadFiles(arg0, arg1, this.parseParameters(args, arg2))
                            .then(() => api.runJob(arg0))
                            .catch(error => this.logError("create job", error));
                    }
                    api.runJob(arg0)
                        .catch(error => this.logError("run job", error));
                    return;

                case "fetch":
                    if (args["wait"]) {
                        api.waitFetchResultFiles(arg0)
                            .catch(error => this.logError("wait and fetch files", error));
                    }
                    else {
                        api.fetchResultFiles(arg0)
                            .catch(error => this.logError("fetch files", error));
                    }
                    return;

                case "cancel":
                    api.cancelJob(arg0)
                        .catch(error => this.logError("cancel job", error));
                    return;

                case "delete":
                    api.deleteJob(arg0)
                        .catch(error => this.logError("delete job", error));
                    return;

                case "status":
                    if (arg0) {
                        api.jobInfo(arg0).then(info => {
                            console.log(JSON.stringify(info, null, 2));
                        })
                        .catch(error => this.logError("job status", error));
                    }
                    else {
                        api.machineInfo().then(info => {
                            console.log(JSON.stringify(info, null, 2));
                        })
                        .catch(error => this.logError("machine info", error));
                    }
                    return;

                case "recipes":
                    api.listRecipes().then(info => {
                        console.log(JSON.stringify(info, null, 2));
                    })
                    .catch(error => this.logError("get recipes", error));
                    return;

                case "recipe":
                    api.getRecipe(arg0).then(info => {
                        console.log(JSON.stringify(info, null, 2));
                    })
                    .catch(error => this.logError("get recipe info", error));
                    return;

                default:
                    console.log(`Unknown command: ${command}`);
                    process.exit(1);
            }
        }
        catch(error) {
            console.log(`Error: ${error.message}`);
            process.exit(0);
        }
    }

    setClientId(clientId: string)
    {
        fs.writeFileSync(CLIProcessor.clientIdFilePath, clientId);
    }

    getClientId(): string
    {
        if (this.clientId) {
            return this.clientId;
        }

        try {
            this.clientId = fs.readFileSync(CLIProcessor.clientIdFilePath).toString();
            return this.clientId;
        }
        catch(e) {
            return "";
        }
    }

    setMachineAddress(address: string)
    {
        fs.writeFileSync(CLIProcessor.machineAddressFilePath, address);
    }

    getMachineAddress(): string
    {
        if (this.machineAddress) {
            return this.machineAddress;
        }

        try {
            this.machineAddress = fs.readFileSync(CLIProcessor.machineAddressFilePath).toString();
            return this.machineAddress;
        }
        catch(e) {
            return "";
        }
    }

    printHelp()
    {
        console.log(`
Usage:
  cook command [args] [parameters]
    commands:
      machine [address]        set or get machine address
      client [id]              set or get client id
      create jobId recipeId    create job with given recipe name and assign given job id, then upload files
                               append recipe-specific parameters: --param=value, example: --highPolyMeshFile=mesh.obj
      run jobId [recipeId]     create and run job with given recipe name and assign given job id
      fetch jobId [--wait]     if the wait flag is set, waits for job completion, then downloads all result files
      cancel jobId             cancel job with given id
      delete jobId             delete job with given id
      status [jobId]           get job or machine status
      recipes                  list available recipes
      recipe [recipeId]        list recipe details
      help                     print this message
        `);
    }

    validateParameters(api: ApiClient, recipeId: string, parameters: Dictionary<string>)
    {
        api.getRecipe(recipeId).then((recipe: IRecipe) => {

        })
    }

    parseParameters(args, parameterFilePath: string)
    {
        let parameters = {};

        // read optional parameter configuration file
        if (parameterFilePath) {
            if (path.extname(parameterFilePath) !== ".json") {
                parameterFilePath += ".json";
            }

            const jsonParameter = fs.readFileSync(parameterFilePath, "utf8");
            parameters = JSON.parse(jsonParameter);
        }

        // mix in additional CLI parameters
        for(const name in args) {
            if (args.hasOwnProperty(name) && name !== "_") {
                let value = args[name];
                if (typeof value === "string") {
                    if (value === "true") {
                        value = true;
                    }
                    else if (value === "false") {
                        value = false;
                    }
                    else {
                        const v = parseFloat(value);
                        if (!isNaN(v)) {
                            value = v;
                        }
                    }
                }
                parameters[name] = value;
            }
        }

        return parameters;
    }

    logError(task: string, error: Error)
    {
        console.log(`failed to ${task}: ${error.message}`);
        process.exit(1);
    }
}