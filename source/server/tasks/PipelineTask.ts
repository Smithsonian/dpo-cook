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

import Job from "../app/Job";
import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[PipelineTask]]. */
export interface IPipelineTaskParameters extends ITaskParameters
{
    /** Array of tasks to be executed, together with their options. */
    tasks?: Array<{ task: string, parameters: ITaskParameters }>;
}

/**
 * Executes a linear sequence of tasks.
 *
 * Parameters: [[IPipelineTaskParameters]]
 */
export default class PipelineTask extends Task
{
    static readonly description = "Executes a linear sequence of tasks.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            tasks: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        task: {
                            type: "string",
                            minLength: 1
                        },
                        parameters: {
                            type: "object"
                        }
                    }
                }
            }
        }
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(PipelineTask.parameterSchema);


    protected taskQueue: Task[];

    constructor(options: IPipelineTaskParameters, context: Job)
    {
        super(options, context);

        this.taskQueue = options.tasks.map(
            entry => context.manager.createTask(entry.task, entry.parameters, context));

        this.logEvent = this.logEvent.bind(this);
    }

    scheduleTask(task: Task)
    {
        this.taskQueue.push(task);
    }

    scheduleTasks(tasks: Task[])
    {
        this.taskQueue = this.taskQueue.concat(tasks);
    }

    run(): Promise<void>
    {
        this.startTask();

        let promise = Promise.resolve();

        this.taskQueue.forEach(task => {
            promise = promise.then(() => {
                return task.run();
            });
        });

        return promise.then(() => {
            this.endTask(null, "done");
        })
        .catch(err => {
            this.endTask(err, "error");
            throw err;
        });
    }
}