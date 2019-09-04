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

import ToolInstance, { IToolStateEvent, IToolMessageEvent, IToolScript } from "./ToolInstance";

////////////////////////////////////////////////////////////////////////////////

export { ToolInstance, IToolStateEvent, IToolMessageEvent, IToolScript };

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

export interface IToolSettings
{
    timeout?: number;
}

export type ToolState = "created" | "waiting" | "running" | "done" | "error" | "timeout" | "cancelled";

export interface IToolSetup
{
    command: string;
    script?: IToolScript
}

export default class Tool<
    T extends Tool<any, IToolSettings> = Tool<any, IToolSettings>,
    S extends IToolSettings = IToolSettings
    >
{
    static readonly toolName: string;

    protected static readonly defaultSettings: Partial<IToolSettings> = {};

    readonly configuration: IToolConfiguration;

    private _runningInstances: ToolInstance[];
    private _waitingInstances: ToolInstance[];

    get name() {
        return (this.constructor as typeof Tool).toolName;
    }
    get waitingInstanceCount() {
        return this._waitingInstances.length;
    }
    get runningInstanceCount() {
        return this._runningInstances.length;
    }

    constructor(config: IToolConfiguration)
    {
        this.configuration = Object.assign({}, config);
        this._waitingInstances = [];
        this._runningInstances = [];
    }

    /**
     * Creates and returns an instance for this tool. The instance object keeps track of the
     * tool instance's state and settings.
     * @param settings The settings to be used for instance invocation.
     * @param workDir The path to the directory to be used for work files.
     */
    createInstance(settings: S, workDir: string): ToolInstance<T, S>
    {
        settings = this.conformSettings(settings);
        const tool: T = this as any;
        return new ToolInstance<T, S>(tool, settings, workDir);
    }

    /**
     * Returns true if this tool can run additional instances. The maximum number of instances
     * is defined in the tool configuration.
     */
    canRunInstance()
    {
        return this.runningInstanceCount < this.configuration.maxInstances;
    }

    /**
     * Called when the state of a tool instance changes.
     * @param event
     */
    onInstanceState(event: IToolStateEvent)
    {
        const { instance, state } = event;

        const waitIndex = this._waitingInstances.indexOf(instance);
        if (waitIndex >= 0) {
            this._waitingInstances.splice(waitIndex, 1);
        }

        const runIndex = this._runningInstances.indexOf(instance);
        if (runIndex >= 0) {
            this._runningInstances.splice(runIndex, 1);
        }

        switch(state) {
            case "running":
                this._runningInstances.push(instance);
                break;
            case "waiting":
                this._waitingInstances.push(instance);
                break;
        }
    }

    /**
     * Called with messages from running tool instances.
     * @param event
     */
    onInstanceMessage(event: IToolMessageEvent)
    {
    }

    /**
     * Subclasses must override.
     * Called before the tool instance is started. Must return an [IToolSetup]
     * with a command to be executed and optionally a generated script file.
     * @param instance
     */
    async setupInstance(instance: ToolInstance): Promise<IToolSetup>
    {
        return Promise.reject("must override");
    }

    /**
     * Called before the tool instance is executed.
     * Override to perform setup tasks.
     * @param instance The tool instance about to be executed.
     */
    async instanceWillStart(instance: ToolInstance): Promise<unknown>
    {
        return Promise.resolve();
    }

    /**
     * Called after the tool instance exited.
     * Override to perform cleanup tasks.
     * @param instance The tool instance that exited.
     */
    async instanceDidExit(instance: ToolInstance): Promise<unknown>
    {
        return Promise.resolve();
    }

    private conformSettings(settings: S): S
    {
        // merges given settings with the default settings. Omits setting props with a value of 'undefined'.
        const defaultSettings = (this.constructor as typeof Tool).defaultSettings;
        const mergedSettings = Object.assign({}, defaultSettings);
        const settingsKeys = Object.getOwnPropertyNames(settings);

        for (const key of settingsKeys) {
            if (settings[key] !== undefined) {
                mergedSettings[key] = settings[key];
            }
        }

        return mergedSettings as S;
    }
}