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

import { Dictionary } from "@ff/core/types";

import * as jsonLoader from "../utils/jsonLoader";

import Tool, { ToolInstance, IToolSettings, IToolConfiguration } from "./Tool";

import Task, { ITaskParameters } from "./Task";
import Job from "./Job";
import { ConfigurationError } from "./Errors";

////////////////////////////////////////////////////////////////////////////////

export default class TaskManager
{
    private taskTypes: {};
    protected tools: { [id:string]: Tool };
    protected toolConfigurations: Dictionary<IToolConfiguration>;

    constructor(dirs: { base: string, tools: string, tasks: string })
    {
        this.taskTypes = {};
        this.tools = {};

        const schemaDir = path.resolve(dirs.base, "schemas/");
        const toolsSchemaPath = path.resolve(schemaDir, "tools.schema.json");
        const toolsFilePath = path.resolve(dirs.base, "tools.json");
        this.toolConfigurations = jsonLoader.validate(toolsFilePath, toolsSchemaPath, true);

        this.loadTools(dirs.tools);
        this.loadTasks(dirs.tasks);
    }

    createTask(taskName: string, parameters: ITaskParameters, context: Job): Task
    {
        const taskType = this.getTaskType(taskName);
        return new taskType(parameters, context);
    }

    createToolInstance(name: string, settings: IToolSettings, jobDir: string): ToolInstance
    {
        const tool = this.tools[name];
        if (!tool) {
            return null;
        }

        return tool.createInstance(settings, jobDir);
    }

    getTaskType(taskName: string): typeof Task
    {
        const taskType = this.taskTypes[taskName];
        if (!taskType) {
            throw new RangeError(`unknown task: ${taskName}`);
        }

        return taskType;
    }

    protected loadTasks(tasksDir: string)
    {
        const taskFiles = fs.readdirSync(tasksDir);
        let count = 0;

        taskFiles.forEach(taskFile => {
            if (path.extname(taskFile) === ".js") {
                const taskPath = path.resolve(tasksDir, taskFile);
                const taskType: typeof Task = require(taskPath).default;
                const taskName = taskType.name.substr(0, taskType.name.length - 4);
                this.taskTypes[taskName] = taskType;
                count++;
            }
        });

        console.log(`Tasks loaded: ${count}`);
    }

    protected loadTools(toolsDir: string)
    {
        const toolFiles = fs.readdirSync(toolsDir);
        let count = 0;

        toolFiles.forEach(toolFile => {
            if (path.extname(toolFile) === ".js") {
                const toolPath = path.resolve(toolsDir, toolFile);

                let ToolType: typeof Tool;
                try {
                    ToolType = require(toolPath).default;
                }
                catch(error) {
                    throw new ConfigurationError(`failed to load/parse tool module '${toolFile}': ${error.message}`);
                }

                const toolName = ToolType.toolName;
                const config = this.toolConfigurations[toolName];

                if (config) {
                    if (!fs.existsSync(config.executable)) {
                        throw new ConfigurationError(`executable for tool '${toolName}' not found: '${config.executable}'`);
                    }

                    const tool = new ToolType(config);
                    this.tools[toolName] = tool;
                    count++;
                }
                else {
                    console.warn(`configuration for tool '${toolName}' not found`);
                }
            }
        });

        console.log(`Tools loaded: ${count}`);
    }
}
