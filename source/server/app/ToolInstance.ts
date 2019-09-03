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

import * as path from "path";
import * as osUtils from "os-utils";
import * as child_process from "child_process";

import Publisher, { ITypedEvent } from "@ff/core/Publisher";

import Tool, { IToolSettings, IToolSetup, ToolState } from "./Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IToolReport
{
    name: string;
    executable: string;
    version: string;

    execution: {
        settings: IToolSettings;

        script?: IToolScript;
        command: string;
        timeout: number;

        start: string;
        end: string;
        duration: number;

        state: ToolState;
        code: number;
        error: string;

        log: Array<{
            time: string;
            level: string;
            message: string;
        }>;
    };
}

export interface IToolScript
{
    filePath: string;
    content: string;
}

export interface IToolStateEvent<T extends Tool, S extends IToolSettings> extends ITypedEvent<"state">
{
    time: Date;
    state: ToolState;
    instance: ToolInstance<T, S>;
}

export type MessageLevel = "debug" | "info" | "warning" | "error";

export interface IToolMessageEvent<T extends Tool, S extends IToolSettings> extends ITypedEvent<"message">
{
    time: Date;
    level: MessageLevel;
    message: string;
    instance: ToolInstance<T, S>;
}

export default class ToolInstance<T extends Tool, S extends IToolSettings> extends Publisher
{
    readonly tool: T;
    readonly settings: S;
    readonly workDir: string;
    readonly report: IToolReport;

    private _requestCancel: boolean;

    constructor(tool: T, settings: S, workDir: string)
    {
        super();
        this.addEvents("state", "message");

        this.tool = tool;
        this.settings = settings;
        this.workDir = workDir;
        this.report = this.createReport();

        this._requestCancel = false;
    }

    get code() {
        return this.report.execution.code;
    }
    get error() {
        return this.report.execution.error;
    }
    get state() {
        return this.report.execution.state;
    }
    get timeout() {
        return this.settings.timeout || this.tool.configuration.timeout;
    }

    getFilePath(fileName: string): string
    {
        if (!fileName) {
            return "";
        }

        return path.resolve(this.workDir, fileName);
    }

    async run(): Promise<void>
    {
        const tool = this.tool;
        const report = this.report.execution;

        const setup = await tool.setup(this);

        report.command = setup.command;
        report.script = setup.script;

        const canStart = await this.wait();
        if (canStart) {
            await tool.willStart(this);
            await this.start(setup);
            await tool.didExit(this);
        }
    }

    async cancel(): Promise<void>
    {
        return new Promise((resolve, reject) => {
            const state = this.report.execution.state;

            // if job is already done (done, timeout, error, cancelled), fulfill immediately
            if (state !== "created" && state !== "waiting" && state !== "running") {
                return resolve();
            }

            // set request flag and wait until it is cleared
            this._requestCancel = true;

            // if cancellation not successful after 5 seconds, throw error
            const timeoutHandler = setTimeout(() => {
                clearInterval(waitHandler);
                this.setState("error");
                return reject(new Error("failed to cancel within 5 seconds"));
            }, 5000);

            // polling timer, wait until request flag is cleared
            const waitHandler = setInterval(() => {
                if (this._requestCancel === false) {
                    clearTimeout(timeoutHandler);
                    clearInterval(waitHandler);
                    return resolve();
                }
            }, 200);
        });
    }

    async wait(): Promise<boolean>
    {
        return new Promise((resolve, reject) => {

            // tool instances and CPU available? then run immediately
            osUtils.cpuUsage(usage => {
                if (this.tool.canRunInstance() && usage < 0.9) {
                    return resolve(true);
                }

                // set an interval timer and wait for an instance to become available
                this.setState("waiting");

                const handler = setInterval(() => {
                    // if cancellation has been requested, abort waiting
                    if (this._requestCancel) {
                        this._requestCancel = false;
                        this.setState("cancelled");
                        clearInterval(handler);
                        return resolve(false);
                    }

                    osUtils.cpuUsage(usage => {
                        // start polling; if an instance becomes available, run the tool
                        if (this.tool.canRunInstance() && usage < 0.9) {
                            clearInterval(handler);
                            return resolve(true);
                        }
                    });
                }, 2000);
            });
        });
    }

    async start(setup: IToolSetup)
    {
        const tool = this.tool;
        const report = this.report.execution;

        report.command = setup.command;
        report.script = setup.script || null;
        report.timeout = this.timeout;

        return new Promise((resolve, reject) => {

            let terminated = false;
            const time = new Date();

            this.setState("running");

            // bookkeeping
            report.start = time.toISOString();
            report.state = "running";

            // message handler
            const dataHandler = data => {
                const text = data ? data.toString().trim() : "";
                text && text.split("\n").forEach(message => {
                    this.logMessage("debug", message);
                });
            };

            // run tool
            const shellScript = child_process.exec(setup.command);

            shellScript.stdout.on("data", dataHandler);
            shellScript.stderr.on("data", dataHandler);

            shellScript.on("exit", (code, signal) => {
                if (!terminated) {
                    terminated = true;
                    if (signal) {
                        const error = new Error(`Tool ${tool.name}: terminated with signal '${signal}' and code: '${code}'`);
                        this.exit(error, code, "error");
                        return reject(error);
                    }

                    if (code !== 0) {
                        const error = new Error(`Tool ${tool.name}: terminated with code: ${code}`);
                        this.exit(error, code, "error");
                        return reject(error);
                    }

                    this.exit(null, 0, "done");
                    return resolve();
                }
            });

            // terminates the external tool
            const terminate = (reason: string, endState: ToolState) => {
                if (!terminated) {
                    terminated = true;

                    // try to terminate the tool
                    shellScript.kill(/* "SIGINT" */);

                    // after one second, send an additional task kill command
                    setTimeout(() => {
                        const extraShot = `taskkill /F /IM ${path.basename(this.tool.configuration.executable)}`;
                        console.log("Tool.runApplication: " + extraShot);
                        child_process.exec(extraShot);

                        if (endState === "error" || endState === "timeout") {
                            const error = new Error(`Tool ${tool.name}: ${reason}`);
                            this.exit(error, 0, endState);
                            reject(error);
                        }
                        else {
                            this.exit(null, 0, endState);
                            resolve();
                        }
                    }, 1000);
                }
            };

            shellScript.on("error", err => {
                terminate(`terminated with error: ${err.toString()}`, "error");
            });

            // periodically check whether we should cancel
            const timerHandle = setInterval(() => {
                if (this._requestCancel) {
                    clearInterval(timerHandle);
                    clearTimeout(timeoutHandle);
                    terminate("cancelled by user.", "cancelled");
                }
            }, 500);

            // terminate when reaching timeout
            const timeoutHandle = setTimeout(() => {
                clearTimeout(timeoutHandle);
                clearInterval(timerHandle);
                terminate(`timeout after ${this.timeout} seconds.`, "timeout");
            }, this.timeout * 1000);
        });
    }

    protected exit(error: Error, code: number, endState: ToolState)
    {
        // bookkeeping
        const report = this.report.execution;
        const time = new Date();

        report.end = time.toISOString();
        report.duration = (time.valueOf() - new Date(report.start).valueOf()) * 0.001;
        report.state = endState;
        report.code = code;
        report.error = error ? error.message : "";

        const isError = endState === "error";
        const isTimeout = endState === "timeout";
        const level = isError || isTimeout ? "error" : "debug";

        // send message and change state to 'endState'
        const message =
            `tool '${this.tool.name}' exited after ${report.duration} seconds - ` +
            `${isError ? `ERROR: (${code}) ${error.message}` : (isTimeout ? "ERROR: Timeout" : "OK")}`;

        this.logMessage(level, message);
        this.setState(endState);

        // if tool completed successfully, don't keep debug messages
        if (report.state === "done") {
            report.log = report.log.filter(message => message.level !== "debug");
        }

        // clear cancellation request flag in case it was set and tool just exited
        this._requestCancel = false;
    }

    protected setState(state: ToolState)
    {
        this.report.execution.state = state;

        const event: IToolStateEvent<T, S> = {
            type: "state", time: new Date(), state, instance: this
        };

        this.tool.onInstanceState(event);
        this.emit(event);
    }

    protected logMessage(level: MessageLevel, message: string)
    {
        const event: IToolMessageEvent<T, S> = {
            type: "message", time: new Date(), level, message, instance: this
        };

        this.tool.onInstanceMessage(event);
        this.emit(event);
    }

    protected createReport(): IToolReport
    {
        const configuration = this.tool.configuration;

        return {
            name: this.tool.name,
            executable: configuration.executable,
            version: configuration.version,

            execution: {
                settings: this.settings,
                script: null,
                command: "",
                timeout: 0,

                start: "",
                end: "",
                duration: 0,

                state: "created",
                code: 0,
                error: "",

                log: []
            }
        };
    }
}