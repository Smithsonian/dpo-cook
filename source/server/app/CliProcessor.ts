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
import * as minimist from "minimist";
import * as moment from "moment";
import * as table from "markdown-table";

import uniqueId from "../utils/uniqueId";

import JobManager, { IJobOrder } from "./JobManager";
import * as jsonLoader from "../utils/jsonLoader";

////////////////////////////////////////////////////////////////////////////////

export default class CliProcessor
{
    protected baseDir: string;
    protected debug: boolean;
    protected jobManager: JobManager;

    constructor(baseDir: string, argv: string[], debug: boolean = false)
    {
        this.baseDir = baseDir;
        this.debug = debug;

        const schemaDir = path.resolve(baseDir, "schemas/");
        const configSchemaPath = path.resolve(schemaDir, "server.schema.json");
        const configFilePath = path.resolve(baseDir, "server.json");
        const config = jsonLoader.validate<any>(configFilePath, configSchemaPath, true);

        const { work, recipes, files, tools, tasks } = config.directories;

        const dirs = {
            base: baseDir,
            schemas: schemaDir,
            work: path.resolve(baseDir, work),
            recipes: path.resolve(baseDir, recipes),
            files: path.resolve(baseDir, files),
            tools: path.resolve(baseDir, tools),
            tasks: path.resolve(baseDir, tasks)
        };

        const args = minimist(argv.slice(2));

        if (args.h || args.help) {
            this.printHelp();
            process.exit(0);
        }

        this.jobManager = new JobManager(dirs);
        console.info();

        if (args.l || args.list) {
            this.printRecipeList();
            process.exit(0);
        }

        if (args.i || args.info) {
            this.printRecipeInfo(args.i || args.info);
            process.exit(0);
        }

        const jobOrder = this.parseJob(args);

        // add job to job queue, use current working directory for log files
        this.jobManager.createJob(jobOrder, process.cwd())
            .then(() =>
                this.jobManager.runJob("cli", jobOrder.id))
            .then(() =>
                this.jobManager.removeJob("cli", jobOrder.id))
            .then(() => {
                console.info("\nJob successfully completed\n");
                process.exit(0);
            })
            .catch(error => {
                console.error("\n", error, "\n");
                console.info("Job failed, unrecoverable error\n");
                process.exit(1);
            });
    }

    protected parseJob(args): IJobOrder
    {
        if (!args._ || !args._[0]) {
            console.info("Recipe name or id missing.");
            this.printHelp();
            process.exit(0);
        }

        // read optional parameter configuration file
        let parameterFilePath = args._[1];
        let parameters = {};

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

        const recipeId = args._[0];
        const orderName = "cli_" + recipeId;
        const dateTime = moment().format("YYYYMMDD-HHmmss");

        return {
            id: orderName + "_" + dateTime + "_" + uniqueId(4),
            name: orderName,
            clientId: "cli",
            recipeId,
            parameters: parameters,
            priority: "normal",
            submission: new Date().toISOString()
        };
    }

    protected printRecipeList()
    {
        const recipeInfos = this.jobManager.getRecipeInfoList();

        const rows = recipeInfos.map(info => {
            return [ info.name, info.version, info.id, info.description ];
        });

        rows.unshift([ "Name", "Version", "ID", "Description" ]);
        console.info(table(rows) + "\n");
    }

    protected printRecipeInfo(idOrName: string)
    {
        const recipe = this.jobManager.getRecipeByIdOrName(idOrName);
        if (!recipe) {
            console.error(`recipe with id or name: "${idOrName}" not found.\n`);
            return;
        }

        console.info(`   name: "${recipe.name}"\nversion: ${recipe.version}\n     id: ${recipe.id}\n   desc: ${recipe.description}\n`);
        console.info(recipe.parameterSchema + "\n");
    }

    protected printHelp()
    {
        console.info([
            "Usage:",
            "cook recipe [paramFile]  executes a recipe using the given (optional) parameter file",
            " --param=value           overrides individual parameters in the parameter file",
            " -l, --list              lists all available recipes",
            " -i, --info <recipe>     displays information about a recipe",
            " -h, --help              displays this message",
            "",
            "Examples:",
            "cook web-ready --highPolyMesh=myMesh.obj --highPolyDiffuseMap=myMap.png",
            "cook only-bake bakeParams.json",
            ""
        ].join("\n"));
    }
}