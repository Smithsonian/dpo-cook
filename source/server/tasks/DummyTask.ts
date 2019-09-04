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

import Job from "../app/Job";

import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[DummyTask]]. */
export interface IDummyTaskParameters extends ITaskParameters
{
    /** Whether execution of the task is a success or failure. */
    outcome: "success" | "failure";
    /** Duration of the task in milliseconds. */
    duration?: number;
}

/**
 * A dummy task which does nothing. After a given duration, the task terminates
 * either successfully or it fails (throws an error).
 *
 * Parameters: [[IDummyTaskParameters]].
 */
export default class DummyTask extends Task
{
    static readonly description = "Dummy task with predictable outcome (success/failure).";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            outcome: { type: "string", enum: ["success", "failure"] },
            duration: { title: "duration in ms", type: "integer", minimum: 1, default: 2000 }
        },
        required: [
            "outcome"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(DummyTask.parameterSchema);

    constructor(options: IDummyTaskParameters, context: Job)
    {
        super(options, context);
    }

    protected async execute(): Promise<unknown>
    {
        const options = this.parameters as IDummyTaskParameters;

        return new Promise((resolve, reject) => {

            setTimeout(() => {
                if (options.outcome === "success") {
                    return resolve();
                }

                const err = new Error("Task is set to fail");
                return reject(err);

            }, options.duration)
        })
    }
}