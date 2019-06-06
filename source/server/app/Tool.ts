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
import * as child_process from "child_process";
import * as osUtils from "os-utils";

import Publisher, { ITypedEvent }  from "@ff/core/Publisher";
import { IToolOptions, IToolReport, IToolScript, TToolState } from "common/types";

////////////////////////////////////////////////////////////////////////////////

export { IToolOptions, IToolScript, TToolState };

export interface IToolStartEvent
{
    time: Date;
    sender: Tool;
}

export interface IToolExitEvent
{
    time: Date;
    error?: Error;
    sender: Tool;
}

export type TToolMessageLevel = "debug" | "info" | "warning" | "error";

export interface IToolMessageEvent
{
    time: Date;
    level: TToolMessageLevel;
    message: string;
    sender: Tool;
}

export interface IToolConfiguration
{
    /** Absolute path to the tool's executable file. */
    executable: string;
    /** Installed version of the tool */
    version: string;
    /** Maximum parallel instances of the tool. */
    maxInstances: number;
    /** Maximum allowed time the tool can run in seconds. */
    timeout: number;
}

export default class Tool extends Publisher
{
    static readonly type: string = "Tool";
    static configuration: IToolConfiguration;

    protected static instances: number = 0;

    protected static readonly defaultOptions: Partial<IToolOptions> = {
    };

    options: IToolOptions;
    report: IToolReport;

    protected readonly jobDir: string;
    protected requestCancel: boolean;


    constructor(options: IToolOptions, jobDir: string)
    {
        super();

        this.addEvents("start", "message", "exit");

        this.options = this.conformOptions(options);
        this.report = this.createReport();
        this.jobDir = jobDir;
        this.requestCancel = false;
    }

    get type(): typeof Tool
    {
        return this.constructor as typeof Tool;
    }

    get name(): string
    {
        const typeName = this.type.name;
        return typeName.substr(0, typeName.length - 4);
    }

    get configuration(): IToolConfiguration
    {
        return (this.constructor as typeof Tool).configuration;
    }

    run(): Promise<void>
    {
        return Promise.reject("must override");
    }

    cancel(): Promise<void>
    {
        return new Promise((resolve, reject) => {
            const state = this.report.execution.state;

            // if job is already done (done, timeout, error, cancelled), fulfill immediately
            if (state !== "created" && state !== "waiting" && state !== "running") {
                return resolve();
            }

            // set request flag and wait until it is cleared
            this.requestCancel = true;

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

    protected onStart(time: Date)
    {
    }

    protected onExit(time: Date, error: Error, code: number, endState: TToolState)
    {
    }

    protected onMessage(time: Date, level: TToolMessageLevel, message: string)
    {
        const event: IToolMessageEvent = { time, level, message, sender: this };
        this.emit("message", event);

        this.report.execution.log.push({ time: time.toISOString(), level, message });
    }

    protected waitInstance(command: string, script?: IToolScript): Promise<void>
    {
        let handler;

        return new Promise((resolve, reject) => {

            // tool instances available? then run immediately
            osUtils.cpuUsage(usage => {
                //console.log("CPU usage = %s", usage);
                if (this.type.instances < this.configuration.maxInstances && usage < 0.9) {
                    return this.runInstance(command, script)
                    .then(() =>
                        resolve()
                    )
                    .catch(err =>
                        reject(err)
                    );
                }

                // set an interval timer and wait for an instance to become available
                this.report.execution.state = "waiting";

                handler = setInterval(() => {
                    // if cancellation has been requested, abort waiting
                    if (this.requestCancel) {
                        this.requestCancel = false;
                        clearInterval(handler);
                        this.report.execution.state = "cancelled";
                        resolve();
                    }

                    osUtils.cpuUsage(usage => {
                        //console.log("Waiting, CPU usage = %s", usage);

                        // start polling; if an instance becomes available, run the tool
                        if (this.type.instances < this.configuration.maxInstances && usage < 0.9) {
                            clearInterval(handler);
                            return this.runInstance(command, script)
                            .then(() =>
                                resolve()
                            )
                            .catch(err =>
                                reject(err)
                            );
                        }
                    });
                }, 2000);
            });
        });
    }

    private runInstance(command: string, script?: IToolScript): Promise<void>
    {
        return new Promise((resolve, reject) => {

            this.type.instances++;
            let terminated = false;

            const timeout = this.options.timeout || this.configuration.timeout;

            const time = new Date();

            // bookkeeping
            const exec = this.report.execution;
            exec.start = time.toISOString();
            exec.state = "running";
            exec.command = command;
            exec.script = script || null;
            exec.timeout = timeout;

            // emit tool start event
            const event: IToolStartEvent = { time, sender: this };
            this.emit("start", event);

            this.onStart(time);

            // message handler
            const dataHandler = data => {
                const text = data ? data.toString().trim() : "";
                text && text.split("\n").forEach(line => {
                    this.onMessage(new Date(), "debug", line);
                });
            };

            // run tool
            const shellScript = child_process.exec(command);

            shellScript.stdout.on("data", dataHandler);
            shellScript.stderr.on("data", dataHandler);

            shellScript.on("exit", (code, signal) => {
                if (!terminated) {
                    terminated = true;
                    if (signal) {
                        const error = new Error(`Tool ${this.name}: terminated with signal '${signal}' and code: '${code}'`);
                        this.exitInstance(error, code, "error");
                        return reject(error);
                    }

                    if (code !== 0) {
                        const error = new Error(`Tool ${this.name}: terminated with code: ${code}`);
                        this.exitInstance(error, code, "error");
                        return reject(error);
                    }

                    this.exitInstance(null, 0, "done");
                    return resolve();
                }
            });

            // terminates the external tool
            const terminate = (reason: string, endState: TToolState) => {
                if (!terminated) {
                    terminated = true;

                    // try to terminate the tool
                    shellScript.kill(/* "SIGINT" */);

                    // after one second, send an additional task kill command
                    setTimeout(() => {
                        const extraShot = `taskkill /F /IM ${path.basename(this.configuration.executable)}`;
                        console.log("Tool.runApplication: " + extraShot);
                        child_process.exec(extraShot);

                        if (endState === "error" || endState === "timeout") {
                            const error = new Error(`Tool ${this.name}: ${reason}`);
                            this.exitInstance(error, 0, endState);
                            reject(error);
                        }
                        else {
                            this.exitInstance(null, 0, endState);
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
                if (this.requestCancel) {
                    clearInterval(timerHandle);
                    clearTimeout(timeoutHandle);
                    terminate("cancelled by user.", "cancelled");
                }
            }, 500);

            // terminate when reaching timeout
            const timeoutHandle = setTimeout(() => {
                clearTimeout(timeoutHandle);
                clearInterval(timerHandle);
                terminate(`timeout after ${timeout} seconds.`, "timeout");
            }, timeout * 1000);
        });
    }

    private exitInstance(error: Error, code: number, endState: TToolState)
    {
        const time = new Date();
        this.onExit(time, error, code, endState);

        // bookkeeping
        const exec = this.report.execution;

        exec.end = time.toISOString();
        exec.duration = (time.valueOf() - new Date(exec.start).valueOf()) * 0.001;
        exec.state = endState;
        exec.code = code;
        exec.error = error ? error.message : "";

        // clear cancellation request flag in case it was set and tool just exited
        this.requestCancel = false;

        // if tool completed successfully, don't keep debug messages
        if (exec.state === "done") {
            exec.log = exec.log.filter(message => message.level !== "debug");
        }

        // emit tool exit event
        const event: IToolExitEvent = { time, error, sender: this };
        this.emit("exit", event);

        // free instance
        this.type.instances--;
    }

    protected conformOptions(options: IToolOptions): IToolOptions
    {
        const defaultOptions = (this.constructor as typeof Tool).defaultOptions;
        const merged = Object.assign({}, defaultOptions);
        const keys = Object.getOwnPropertyNames(options);

        for (const key of keys) {
            if (options[key] !== undefined) {
                merged[key] = options[key];
            }
        }

        return merged as IToolOptions;
    }

    protected createReport(): IToolReport
    {
        const configuration = this.configuration;

        return {
            name: this.name,
            executable: configuration.executable,
            version: configuration.version,

            execution: {
                options: this.options,
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

    protected writeFile(filePath: string, content: string): Promise<IToolScript>
    {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, content, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({ filePath, content });
                }
            });
        });
    }

    protected renameFile(oldFileName: string, newFileName: string)
    {
        const jobDir = this.jobDir;
        const oldFilePath = path.resolve(jobDir, oldFileName);
        const newFilePath = path.resolve(jobDir, newFileName);

        if (fs.existsSync(oldFilePath)) {
            fs.renameSync(oldFilePath, newFilePath);
            this.onMessage(new Date(), "info", `renamed file "${oldFilePath}" to "${newFilePath}"`);
        }
        else {
            throw new Error("failed to rename file: can't find " + oldFilePath);
        }
    }

    protected removeFile(fileName: string)
    {
        const filePath = path.resolve(this.jobDir, fileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            this.onMessage(new Date(), "info", `removed file "${filePath}"`);
        }
        else {
            throw new Error("failed to remove file: can't find " + filePath);
        }
    }

    protected getFilePath(fileName: string): string
    {
        if (!fileName) {
            return "";
        }

        return path.resolve(this.jobDir, fileName);
    }
}