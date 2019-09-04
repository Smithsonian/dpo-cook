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
import * as path from "path";
import * as moment from "moment";
import * as table from "markdown-table";

import * as Ajv from "ajv";
import { ValidateFunction } from "ajv";
const jsonValidator = new Ajv({ useDefaults: true });

import {
    ITaskParameters,
    ITaskReport,
    TaskState,
} from "common/types";

import { LogLevel, ITaskLogEvent } from "./TaskLogger";
import Job from "./Job";

////////////////////////////////////////////////////////////////////////////////

export { ITaskParameters };

export default class Task
{
    static readonly taskName: string = "";
    static readonly description: string = "";
    static readonly parameterSchema: object = {};
    static readonly parameterValidator: ValidateFunction = null;

    protected static readonly jsonValidator = jsonValidator;

    readonly report: ITaskReport;

    protected context: Job;
    protected parameters: ITaskParameters;
    protected result: { [id:string]: any };

    private _isCancelling: boolean;
    private _resolveCancelPromise: () => void;
    private _rejectCancelPromise: () => void;

    constructor(params: ITaskParameters, context: Job)
    {
        this.context = context;
        this.parameters = params;
        this.result = {};

        this._isCancelling = false;
        this._resolveCancelPromise = null;
        this._rejectCancelPromise = null;

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

        let validator = this.parameterValidator;

        if (!validator) {
            const message = `parameterValidator undefined for ${this.name}`;
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

    get name(): string {
        return (this.constructor as typeof Task).taskName;
    }
    get description(): string {
        return (this.constructor as typeof Task).description;
    }
    get parameterSchema(): object {
        return (this.constructor as typeof Task).parameterSchema;
    }
    get parameterValidator() {
        return (this.constructor as typeof Task).parameterValidator;
    }
    get state() {
        return this.report.state;
    }
    get isCancelling() {
        return this._isCancelling;
    }

    async run(): Promise<void>
    {
        if (this.state !== "created") {
            return Promise.reject(new Error(
                `task is in '${this.report.state}' state, but can only be run in 'created' state`));
        }

        // bookkeeping, set state to "running"
        this.startTask();

        return this.willStart()
            .then(() => this.execute())
            .then(() => {
                if (this.isCancelling) {
                    this.endTask("cancelled");
                    this.resolveCancel();
                }
                else {
                    this.endTask("done");
                }
            })
            .catch(err => {
                this.endTask("error", err);
                throw err;
            })
            .finally(() => this.didFinish());
    }

    /**
     * Cancels the task. Returns a promise which is resolved when cancellation is complete and
     * the task's state has been switched to "cancelled".
     */
    async cancel(): Promise<unknown>
    {
        if (this.isCancelling) {
            return Promise.reject("cancellation already in progress");
        }

        const report = this.report;

        // if task hasn't been started, we return immediately, setting the state to "cancelled"
        if (report.state === "created") {
            report.state = "cancelled";
            return Promise.resolve();
        }

        // if task has ended, we return immediately, doing nothing
        if (report.state !== "waiting" && report.state !== "running") {
            return Promise.resolve();
        }

        // task is either waiting or running, return a cancel promise
        this._isCancelling = true;
        return this.waitCancel();
    }

    /**
     * The default implementation for cancelling a task creates a promise and waits for a confirmation
     * call to either Task.resolveCancel() or Task.rejectCancel(). It fails if the task isn't cancelled
     * within 5 seconds.
     */
    protected async waitCancel(): Promise<unknown>
    {
        let timeoutHandler;

        return new Promise((resolve, reject) => {
            this._resolveCancelPromise = () => {
                clearTimeout(timeoutHandler);
                resolve();
            };
            this._rejectCancelPromise = () => {
                clearTimeout(timeoutHandler);
                reject();
            };

            // if cancellation not successful after 5 seconds, throw error
            timeoutHandler = setTimeout(() => {
                return reject(new Error("failed to cancel within 5 seconds"));
            }, 5000);
        }).finally(() => {
            this._resolveCancelPromise = null;
            this._rejectCancelPromise = null;
        });
    }

    /**
     * Executes the task. Subclasses must override this method.
     */
    protected async execute(): Promise<unknown>
    {
        return Promise.reject("must override");
    }

    protected async willStart(): Promise<unknown>
    {
        return Promise.resolve();
    }

    protected async didFinish(): Promise<unknown>
    {
        return Promise.resolve();
    }

    protected resolveCancel()
    {
        if (this._resolveCancelPromise) {
            this._resolveCancelPromise();
        }
    }

    protected rejectCancel()
    {
        if (this._rejectCancelPromise) {
            this._rejectCancelPromise();
        }
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

    protected logTaskEvent(level: LogLevel, message: string, sender?: string)
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

    private startTask()
    {
        const time = new Date();
        const report = this.report;

        report.start = time.toISOString();
        report.state = "running";

        this.context.logEvent({
            time, module: "task", level: "info",  message: "started", sender: this.name
        });
    }

    private endTask(state: TaskState, error?: Error)
    {
        const time = new Date();

        const report = this.report;
        report.state = state;
        report.end = time.toISOString();
        report.duration = (time.valueOf() - (new Date(report.start).valueOf())) * 0.001;

        const formattedDuration = moment.utc(
            moment.duration(report.duration, "seconds").asMilliseconds()).format("HH:mm:ss.SSS");

        if (state === "error") {
            report.error = error.message;

            this.context.logEvent({
                time, module: "task", level: "error", sender: this.name,
                message: `terminated with error after ${formattedDuration}`
            });
        }
        else if (state === "cancelled") {
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
}