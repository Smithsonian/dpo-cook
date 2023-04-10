/**
 * 3D Foundation Project
 * Copyright 2023 Smithsonian Institution
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
import * as os from "os";
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

        results?: any;
    };
}

export interface IToolScript
{
    fileName: string;
    content: string;
}

export interface IToolStateEvent extends ITypedEvent<"state">
{
    time: Date;
    state: ToolState;
    instance: ToolInstance;
}

export type MessageLevel = "debug" | "info" | "warning" | "error";

export interface IToolMessageEvent extends ITypedEvent<"message">
{
    time: Date;
    level: MessageLevel;
    message: string;
    instance: ToolInstance;
}

/**
 * An instance of a tool. For each tool, instances can be created using the tool's createInstance() method.
 * After creation, an instance is invoked using the run() method. Execution can be cancelled using the cancel() method.
 * Instance objects keep track of the instance's settings and state.
 *
 * The number of instances which can be run simultaneously is limited and defined in each tool's configuration.
 * If an instance can't be started immediately after run() is called, it enters "waiting" state until instance slots
 * become available for the tool.
 */
export default class ToolInstance<T extends Tool = Tool, S extends IToolSettings = IToolSettings> extends Publisher
{
    readonly tool: T;
    readonly settings: S;
    readonly workDir: string;
    readonly report: IToolReport;

    private _resolveCancel: () => void;


    constructor(tool: T, settings: S, workDir: string)
    {
        super();
        this.addEvents("state", "message");

        this.tool = tool;
        this.settings = settings;
        this.workDir = workDir;
        this.report = this.createReport();

        this._resolveCancel = null;
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
    get cancelRequested() {
        return !!this._resolveCancel;
    }

    async run(): Promise<unknown>
    {
        const tool = this.tool;
        const report = this.report.execution;

        return tool.setupInstance(this).then(setup => {
            report.command = setup.command;
            report.script = setup.script;

            return this.wait().then(() => {
                if (!this._resolveCancel) {
                    return tool.instanceWillExecute(this)
                    .then(() => {
                        return this.execute(setup)
                        .finally(() => tool.instanceDidExit(this));
                    });
                }
            }).finally(() => {
                if (this._resolveCancel) {
                    this._resolveCancel();
                }
            });
        });
    }

    async cancel(): Promise<unknown>
    {
        return new Promise((resolve, reject) => {

            if (this._resolveCancel) {
                return reject("cancellation already in progress");
            }

            const state = this.report.execution.state;

            // if job is in created state, cancel immediately
            if (state === "created") {
                this.setState("cancelled");
                return resolve();
            }

            // if job is already done (done, timeout, error, cancelled), fulfill immediately
            if (state !== "waiting" && state !== "running") {
                return resolve();
            }

            // if cancellation not successful after 5 seconds, throw error
            let timeoutHandler = setTimeout(() => {
                this.setState("error");
                return reject(new Error("failed to cancel within 5 seconds"));
            }, 5000);

            this._resolveCancel = () => {
                this._resolveCancel = null;
                clearTimeout(timeoutHandler);
                timeoutHandler = null;
                resolve();
            };
        });
    }

    /**
     * Helper method, returns an absolute path to the given file in the instance's work directory.
     * @param fileName
     */
    getFilePath(fileName: string): string
    {
        if (!fileName) {
            return "";
        }

        return path.resolve(this.workDir, fileName);
    }

    /**
     * Helper method, writes a file to the instance's work directory.
     * @param fileName
     * @param content
     */
    async writeFile(fileName: string, content: string): Promise<unknown>
    {
        const filePath = this.getFilePath(fileName);
        return fs.writeFile(filePath, content)
        .then(() => this.emitMessage("debug", `file written: '${fileName}'`));
    }

    /**
     * Helper method, reads a file from the instance's work directory.
     * @param fileName
     */
     async readFile(fileName: string): Promise<unknown>
     {
         const filePath = this.getFilePath(fileName);
         return fs.readFile(filePath, "utf8");
     }

    /**
     * Helper method, renames a file in the instance's work directory.
     * @param oldFileName
     * @param newFileName
     */
    async renameFile(oldFileName: string, newFileName: string): Promise<unknown>
    {
        const oldFilePath = this.getFilePath(oldFileName);
        const newFilePath = this.getFilePath(newFileName);

        return fs.exists(oldFilePath).then(exists => {
            if (exists) {
                return fs.rename(oldFilePath, newFilePath)
                .then(() => this.emitMessage("debug", `renamed file '${oldFileName}' to '${newFileName}'`));
            }

            throw new Error(`failed to rename file, can't find '${oldFileName}'`);
        })
    }

    /**
     * Helper method, deletes a file from the instance's work directory.
     * @param fileName
     */
    async removeFile(fileName: string): Promise<unknown>
    {
        const filePath = this.getFilePath(fileName);

        return fs.exists(filePath).then(exists => {
            if (exists) {
                return fs.unlink(filePath)
                .then(() => this.emitMessage("debug", `file removed: '${fileName}'`));
            }

            throw new Error(`failed to remove file, can't find '${fileName}'`);
        })
    }

    /**
     * Waits until there are sufficient resources available for the instance to run.
     * Returns true if cancelled during the wait.
     */
    protected async wait(): Promise<unknown>
    {
        return new Promise((resolve, reject) => {

            // tool instances and CPU available? then run immediately
            osUtils.cpuUsage(usage => {
                if (this.tool.canRunInstance() && usage < 0.9) {
                    return resolve();
                }

                // set an interval timer and wait for an instance to become available
                this.setState("waiting");

                const handler = setInterval(() => {
                    // if cancellation has been requested, abort waiting
                    if (this.cancelRequested) {
                        clearInterval(handler);
                        return resolve();
                    }

                    osUtils.cpuUsage(usage => {
                        // start polling; if an instance becomes available, run the tool
                        if (this.tool.canRunInstance() && usage < 0.9) {
                            clearInterval(handler);
                            return resolve();
                        }
                    });
                }, 2000);
            });
        });
    }

    protected async execute(setup: IToolSetup)
    {
        const tool = this.tool;
        const report = this.report.execution;

        report.command = setup.command;
        report.script = setup.script || null;
        report.timeout = this.timeout;

        let cancelTimerHandle = null;
        let timeoutHandle = null;

        return new Promise((resolve, reject) => {

            let terminated = false;
            const time = new Date();

            this.setState("running");

            // bookkeeping
            report.start = time.toISOString();
            report.state = "running";

            // message handler
            const dataHandler = () => {
                let chunk = "";
                return data => {
                    chunk += data.toString();
                    while(true) {
                        //const eol = Math.max(chunk.indexOf(os.EOL),chunk.indexOf("\n"));
                        const eolIdx = chunk.indexOf(os.EOL);
                        const eol = eolIdx >= 0 ? eolIdx : chunk.indexOf("\n");
                        if (eol >= 0) {
                            const line = chunk.substring(0, eol);
                            chunk = chunk.substring(eol + os.EOL.length - 1);
                            line && this.emitMessage("debug", line);
                        }
                        else {
                            break;
                        }
                    }
                };
            };

            // run tool
            const shellScript = child_process.exec(setup.command, {maxBuffer: 4096*1024});

            shellScript.stdout.on("data", dataHandler());
            shellScript.stderr.on("data", dataHandler());

            shellScript.on("exit", (code, signal) => {
                if (!terminated) {
                    terminated = true;

                    clearInterval(cancelTimerHandle);
                    clearTimeout(timeoutHandle);

                    if (signal) {
                        const error = new Error(`Tool ${tool.name}: terminated with signal '${signal}' and code: '${code}'`);
                        this.didExit("error", code, error);
                        return reject(error);
                    }

                    if (code !== 0) {
                        const error = new Error(`Tool ${tool.name}: terminated with code: ${code}`);
                        this.didExit("error", code, error);
                        return reject(error);
                    }

                    this.didExit("done", 0);
                    return resolve();
                }
            });

            // terminates the external tool
            const terminate = (reason: string, endState: ToolState) => {
                if (!terminated) {
                    terminated = true;

                    clearInterval(cancelTimerHandle);
                    clearTimeout(timeoutHandle);

                    // try to terminate the tool
                    shellScript.kill(/* "SIGINT" */);

                    // after one second, send an additional task kill command
                    setTimeout(() => {
                        const extraShot = `taskkill /F /IM ${path.basename(this.tool.configuration.executable)}`;
                        console.log("Tool.runApplication: " + extraShot);
                        child_process.exec(extraShot);

                        if (endState === "error" || endState === "timeout") {
                            const error = new Error(`Tool ${tool.name}: ${reason}`);
                            this.didExit(endState, 0, error);
                            reject(error);
                        }
                        else {
                            this.didExit(endState, 0);
                            resolve();
                        }
                    }, 1000);
                }
            };

            shellScript.on("error", err => {
                terminate(`terminated with error: ${err.toString()}`, "error");
            });

            // periodically check whether we should cancel
            cancelTimerHandle = setInterval(() => {
                if (this.cancelRequested) {
                    terminate("cancelled by user.", "cancelled");
                }
            }, 250);

            // terminate when reaching timeout
            timeoutHandle = setTimeout(() => {
                terminate(`timeout after ${this.timeout} seconds.`, "timeout");
            }, this.timeout * 1000);
        });
    }

    /**
     * Called after the tool has exited. Does bookkeeping and keeps track of the exit state.
     * @param endState
     * @param code
     * @param error
     */
    protected didExit(endState: ToolState, code: number, error?: Error)
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

        this.emitMessage(level, message);
        this.setState(endState);

        // if tool completed successfully, don't keep debug messages
        if (report.state === "done") {
            report.log = report.log.filter(message => message.level !== "debug");
        }
    }

    /**
     * Sends a message from the instance. Emits an [[IToolMessageEvent]].
     * @param level
     * @param message
     */
    protected emitMessage(level: MessageLevel, message: string)
    {
        const event: IToolMessageEvent = {
            type: "message", time: new Date(), level, message, instance: this
        };

        const discard = this.tool.onInstanceMessage(event);
        if (!discard) {
            this.emit(event);
        }
    }

    /**
     * Changes the state of the instance. Emits a [[IToolStateEvent]].
     * @param state
     */
    protected setState(state: ToolState)
    {
        this.report.execution.state = state;

        const event: IToolStateEvent = {
            type: "state", time: new Date(), state, instance: this
        };

        this.tool.onInstanceState(event);
        this.emit(event);
    }

    private createReport(): IToolReport
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