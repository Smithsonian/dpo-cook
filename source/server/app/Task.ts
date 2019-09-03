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

import { promises as fs } from "fs";
import * as moment from "moment";
import * as table from "markdown-table";

import * as Ajv from "ajv";
import { ValidateFunction } from "ajv";
const jsonValidator = new Ajv({ useDefaults: true });

import {
    ITaskParameters,
    ITaskReport,
    TTaskState,
    TTaskEndState
} from "common/types";

import LegacyTool, {
    IToolOptions,
    IToolStartEvent,
    IToolMessageEvent,
    IToolExitEvent
} from "./LegacyTool";

import { TLogLevel, ITaskLogEvent } from "./TaskLogger";
import Job from "./Job";
import * as path from "path";

////////////////////////////////////////////////////////////////////////////////

export { ITaskParameters };

export default class Task
{
    static readonly description: string = "";
    static readonly parameterSchema: object = {};
    static readonly parameterValidator: ValidateFunction = null;

    protected static readonly jsonValidator = jsonValidator;

    readonly report: ITaskReport;

    protected context: Job;
    protected parameters: ITaskParameters;
    protected result: { [id:string]: any };
    protected tools: LegacyTool[];

    protected currentToolInstance: LegacyTool;
    protected requestCancel: boolean;


    constructor(params: ITaskParameters, context: Job)
    {
        this.onToolStart = this.onToolStart.bind(this);
        this.onToolMessage = this.onToolMessage.bind(this);
        this.onToolExit = this.onToolExit.bind(this);

        this.context = context;
        this.parameters = params;
        this.result = {};
        this.tools = [];

        this.currentToolInstance = null;

        this.report = {
            name: this.name,
            parameters: this.parameters,
            tools: [],
            start: "",
            end: "",
            duration: 0,
            state: "created",
            error: "",
            log: [],
            result: this.result
        };

        let validator = this.type.parameterValidator;

        if (!validator) {
            const message = `parameterValidator undefined for ${this.type.name}`;
            this.logTaskEvent("error", message);
            throw new Error(message);
        }

        if (!validator(params)) {
            // debug output table of validated task parameters
            console.debug(`\nTask.Constructor - '${this.name}' - Parameter validation failed:\n`);
            console.debug(this.dumpProperties(params));

            const message = `parameter validation failed: ${jsonValidator.errorsText(validator.errors)}`;
            this.logTaskEvent("error", message);
            throw new Error(message);
        }
    }

    get type(): typeof Task
    {
        return this.constructor as typeof Task;
    }

    get name(): string
    {
        const typeName = this.type.name;
        return typeName.substr(0, typeName.length - 4);
    }

    get description(): string
    {
        return this.type.description;
    }

    get parameterSchema(): object
    {
        return this.type.parameterSchema;
    }

    run(): Promise<void>
    {
        if (this.report.state !== "created") {
            return Promise.reject(new Error(
                `task is in '${this.report.state}' state, but can only be run in 'created' state`));
        }

        this.startTask();

        return this.runTool()
            .then(() => {
                if (this.requestCancel) {
                    this.endTask(null, "cancelled");
                }
                else {
                    this.endTask(null, "done");
                }
            })
            .catch(err => {
                this.endTask(err, "error");
                throw err;
            });
    }

    cancel(): Promise<void>
    {
        const report = this.report;

        if (report.state === "created") {
            report.state = "cancelled";
            return Promise.resolve();
        }
        if (report.state !== "waiting" && report.state !== "running") {
            return Promise.resolve();
        }

        // set cancellation request flag
        this.requestCancel = true;

        // if a tool is running, ask it to cancel
        if (this.currentToolInstance) {
            return this.currentToolInstance.cancel();
        }

        return new Promise((resolve, reject) => {

            // if cancellation not successful after 5 seconds, throw error
            const timeoutHandler = setTimeout(() => {
                clearInterval(waitHandler);
                return reject(new Error("failed to cancel within 5 seconds"));
            }, 5000);

            // polling timer, wait until request flag is cleared
            const waitHandler = setInterval(() => {
                if (this.requestCancel === false) {
                    clearTimeout(timeoutHandler);
                    clearInterval(waitHandler);
                    return resolve();
                }
            }, 100);
        });
    }

    addTool(toolName: string, options: IToolOptions)
    {
        const toolInstance = this.context.manager.createToolInstance(toolName, options, this.context.jobDir);
        this.report.tools.push(toolInstance.report);
        this.tools.push(toolInstance);
    }

    protected startTask()
    {
        const time = new Date();
        const report = this.report;

        report.start = time.toISOString();
        report.state = "running";

        this.onTaskStart(time);

        this.context.logEvent({
            time, module: "task", level: "info",  message: "started", sender: this.name
        });
    }

    protected endTask(error: Error, endState: TTaskEndState)
    {
        this.requestCancel = false;

        const time = new Date();
        this.onTaskEnd(time, error, endState);

        const report = this.report;
        report.state = endState;
        report.end = time.toISOString();
        report.duration = (time.valueOf() - (new Date(report.start).valueOf())) * 0.001;

        const formattedDuration = moment.utc(
            moment.duration(report.duration, "seconds").asMilliseconds()).format("HH:mm:ss.SSS");

        if (endState === "error") {
            report.error = error.message;

            this.context.logEvent({
                time, module: "task", level: "error", sender: this.name,
                message: `terminated with error after ${formattedDuration}`
            });
        }
        else if (endState === "cancelled") {
            this.context.logEvent({
                time, module: "task", level: "warning", sender: this.name,
                message: `cancelled by user after ${formattedDuration}`
            });
        }
        else {
            this.context.logEvent({
                time, module: "task", level: "info", sender: this.name,
                message: `completed successfully after ${formattedDuration}`
            });
        }
    }

    protected onTaskStart(time: Date)
    {
    }

    protected onTaskEnd(time: Date, error: Error, endState: TTaskState)
    {
    }

    protected runTool(): Promise<void>
    {
        const toolInstance = this.tools[0];
        this.preToolStart(toolInstance);

        return toolInstance.run()
        .then(() => {
            this.postToolExit(toolInstance);
        })
        .catch(err => {
            this.postToolExit(toolInstance);
            throw err;
        });
    }

    protected preToolStart(toolInstance: LegacyTool)
    {
        this.currentToolInstance = toolInstance;

        toolInstance.on("start", this.onToolStart);
        toolInstance.on("message", this.onToolMessage);
        toolInstance.on("exit", this.onToolExit);
    }

    protected postToolExit(toolInstance: LegacyTool)
    {
        toolInstance.off("start", this.onToolStart);
        toolInstance.off("message", this.onToolMessage);
        toolInstance.off("exit", this.onToolExit);

        this.currentToolInstance = null;
    }

    protected logEvent(event: ITaskLogEvent)
    {
        if (event.level !== "debug" || event.module === "task") {
            this.reportEvent(event);
        }

        this.context.logEvent(event);
    }

    protected reportEvent(event: ITaskLogEvent)
    {
        this.report.log.push({
            time: event.time.toISOString(),
            level: event.level,
            message: event.message
        });
    }

    protected logTaskEvent(level: TLogLevel, message: string, sender?: string)
    {
        this.logEvent({
            time: new Date(),
            module: "task",
            level,
            message,
            sender: sender || this.name
        });
    }

    protected getFilePath(fileName: string): string
    {
        if (!fileName) {
            return "";
        }

        return path.resolve(this.context.jobDir, fileName);
    }

    protected async writeFile(fileName: string, content: string | Buffer): Promise<void>
    {
        const path = this.getFilePath(fileName);

        if (typeof content === "string") {
            await fs.writeFile(path, content, "utf8");
        }
        else {
            await fs.writeFile(path, content);
        }
    }

    protected dumpProperties(props, rows?, propPath?)
    {
        let isRoot = false;
        if (!rows) {
            isRoot = true;
            rows = [];
            propPath = "";
        }

        if (propPath) {
            propPath += ".";
        }

        for (let key in props) {
            const value = props[key];
            if (typeof value === "object") {
                this.dumpProperties(value, rows, propPath + key);
            }
            else {
                rows.push([ propPath + key, value ]);
            }
        }

        if (isRoot) {
            rows.unshift([ "Name", "Value" ]);
            return "\n" + table(rows) + "\n";
        }
    }

    protected onToolStart(e: IToolStartEvent)
    {
        const message = `tool '${e.sender.name}' started: ${e.sender.report.execution.command}`;

        this.logTaskEvent("info", message);
    }

    protected onToolExit(e: IToolExitEvent)
    {
        const exec = e.sender.report.execution;
        const isError = exec.state === "error";
        const isTimeout = exec.state === "timeout";

        const message =
            `tool '${e.sender.name}' exited after ${exec.duration} seconds - ` +
            `${isError ? `ERROR: (${exec.code}) ${exec.error}` : (isTimeout ? "ERROR: Timeout" : "OK")}`;

        this.logTaskEvent(isError ? "warning" : "info", message);
    }

    protected onToolMessage(e: IToolMessageEvent)
    {
        this.logEvent({
            time: e.time, module: "tool", level: "debug", message: `>> ${e.message}`, sender: e.sender.name
        });
    }
}