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
import * as mkdirp from "mkdirp";
import * as rimraf from "rimraf";

import Publisher from "@ff/core/Publisher";

import TaskLogger, { ITaskLogEvent } from "./TaskLogger";
import TaskManager from "./TaskManager";
import { IJobOrder, IJobReport } from "./JobManager";

import RecipeTask, { IRecipeTaskParameters } from "../tasks/RecipeTask";

////////////////////////////////////////////////////////////////////////////////

export interface IJobLogEvent extends ITaskLogEvent
{
    clientId: string;
}

export interface IJobOptions
{
    jobOrder: IJobOrder;
    /** Directory for temporary files. */
    jobDir: string;
    /** Directory for log files. If unset, the job directory is used. */
    logDir?: string;
}

export default class Job extends Publisher
{
    readonly manager: TaskManager;
    readonly logger: any;
    readonly jobDir: string;

    readonly data: { [id:string]: any };

    protected task: RecipeTask;
    protected jobDirCreated: boolean;


    constructor(manager: TaskManager, options: IJobOptions)
    {
        super();
        this.addEvents("log");

        this.manager = manager;
        this.logger = new TaskLogger(options.logDir || options.jobDir);
        this.jobDir = options.jobDir;

        this.data = {
            report: this.createReport(options.jobOrder)
        };

        this.jobDirCreated = false;
        this.createJobDir();

        const params: IRecipeTaskParameters = {
            recipe: options.jobOrder.recipe,
            parameters: options.jobOrder.parameters
        };

        this.task = manager.createTask("Recipe", params, this) as RecipeTask;
    }

    get id(): string
    {
        return this.data.report.id;
    }

    get clientId(): string
    {
        return this.data.report.clientId;
    }

    run(): Promise<void>
    {
        return this.task.run()
            .then(() => {
                return this.logger.taskDone(this.data.report);
            })
            .catch(error => {
                return this.logger.taskDone(this.data.report, error)
                    .then(() => {
                        throw error;
                    });
            });
    }

    cancel(): Promise<void>
    {
        return this.task.cancel()
            .then(() => {
                return this.logger.taskDone(this.data.report);
            });
    }

    destroy(keepTempDir?: boolean): Promise<void>
    {
        return this.cancel()
            .then(() => {
                if (!keepTempDir) {
                    this.deleteJobDir();
                }
            });
    }

    logEvent(event: ITaskLogEvent)
    {
        this.logger.logEvent(event);

        const jobEvent: IJobLogEvent = Object.assign({}, event, { clientId: this.clientId });
        this.emit("log", jobEvent);
    }

    protected createJobDir()
    {
        this.jobDirCreated = false;

        if (fs.existsSync(this.jobDir)) {
            return;
        }

        mkdirp(this.jobDir, err => {
            if (err) {
                throw new Error(err);
            }
        });

        this.logger.logEvent({
            module: "runner",
            level: "debug",
            message: `Work directory created: '${this.jobDir}'`
        });

        this.jobDirCreated = true;
    }

    deleteJobDir()
    {
        if (this.jobDirCreated && this.jobDir) {
            rimraf.sync(this.jobDir);

            this.logger.logEvent({
                module: "runner",
                level: "debug",
                message: `Work directory deleted: '${this.jobDir}'`
            });

            this.jobDirCreated = false;
        }
    }

    protected createReport(order: IJobOrder): IJobReport
    {
        return {
            id: order.id,
            name: order.name,
            clientId: order.clientId,
            priority: order.priority || "normal",
            submission: order.submission || new Date().toISOString(),

            recipe: order.recipe,
            parameters: order.parameters,

            start: "",
            end: "",
            duration: 0,

            state: "created",
            step: "",
            error: "",

            steps: {}
        }
    }
}