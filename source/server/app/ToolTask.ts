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

import {
    ITaskParameters,
} from "common/types";

import {
    ToolInstance,
    IToolSettings,
    IToolMessageEvent,
    IToolStateEvent,
} from "./Tool";

import Job from "./Job";

import Task from "./Task";

////////////////////////////////////////////////////////////////////////////////

export { ToolInstance, IToolMessageEvent, IToolStateEvent };

export default class ToolTask extends Task
{
    protected instances: ToolInstance[];
    protected runningInstance: ToolInstance;

    constructor(params: ITaskParameters, context: Job)
    {
        super(params, context);

        this.instances = [];
        this.runningInstance = null;
    }

    /**
     * Adds a tool to the task's list of tools to be executed.
     * @param name Name of the tool.
     * @param settings Settings for the tool's invocation.
     */
    addTool(name: string, settings: IToolSettings)
    {
        const instance = this.context.manager.createToolInstance(name, settings, this.context.jobDir);
        this.report.tools.push(instance.report);
        this.instances.push(instance);
    }

    protected async execute(): Promise<unknown>
    {
        const instance = this.instances[0];
        return this.runInstance(instance);
    }

    protected async runInstance(instance: ToolInstance): Promise<unknown>
    {
        instance.on("state", this.onInstanceState, this);
        instance.on("message", this.onInstanceMessage, this);

        this.runningInstance = instance;

        return this.instanceWillStart(instance)
        .then(() => {
            return instance.run()
            .finally(() => this.instanceDidExit(instance));
        })
        .finally(() => {
            this.runningInstance = null;

            instance.off("state", this.onInstanceState, this);
            instance.off("message", this.onInstanceMessage, this);
        });
    }

    protected onCancel()
    {
        if (this.runningInstance) {
            this.runningInstance.cancel();
        }
    }

    protected async instanceWillStart(instance: ToolInstance): Promise<unknown>
    {
        return Promise.resolve();
    }

    protected async instanceDidExit(instance: ToolInstance): Promise<unknown>
    {
        return Promise.resolve();
    }

    protected onInstanceState(event: IToolStateEvent)
    {
    }

    protected onInstanceMessage(event: IToolMessageEvent)
    {
        this.logTaskEvent(event.level, event.message, event.instance.tool.name);
    }
}

