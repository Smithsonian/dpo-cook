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

////////////////////////////////////////////////////////////////////////////////

export type TJobPriority = "high" | "normal" | "low";
export type TLogLevel = "debug" | "info" | "warning" | "error";
export type TTaskState = "created" | "waiting" | "running" | "done" | "error" | "cancelled";
export type TTaskEndState = "done" | "error" | "cancelled";

/** Describes the submission of a new job. */
export interface IJobOrder
{
    /** Identifier of the job. */
    id: string;
    /** Name of the job. */
    name: string;
    /** Identifier of the client of this job order. */
    clientId: string;

    /** Identifier or name of the recipe to be executed. */
    recipeId: string;
    /** Recipe retrieved from recipeId. */
    recipe?: IRecipe;
    /** Parameters for the recipe to be executed. */
    parameters: {
        [id:string]: number | boolean | string;
    };

    /** Priority of this job. */
    priority?: TJobPriority;
    /** Submission date and time (ISO formatted string). */
    submission?: string;
}

/** Short information about a recipe. */
export interface IRecipeInfo
{
    id: string;
    name: string;
    description?: string;
    version?: string;
}

/** Short information about a job. */
export interface IJobInfo
{
    /** Identifier of the job. */
    id: string;
    /** Name of the job. */
    name: string;
    /** Identifier of the client of this job order. */
    clientId: string;
    /** Information about the executed recipe. */
    recipe: IRecipeInfo;

    /** Priority of this job. */
    priority: TJobPriority;
    /** Submission date and time (ISO formatted string). */
    submission: string;
    /** Job start date and time (ISO formatted string). */
    start: string;
    /** Job end date and time (ISO formatted string). */
    end: string;
    /** Duration of the job in seconds. */
    duration: number;

    /** Current execution state of the job. */
    state: TTaskState;
    /** Currently executed processing step. */
    step: string;
    /** In case of an error: description of the problem. */
    error: string;
}

export interface IJobReport
{
    /** Identifier of the job. */
    id: string;
    /** Name of the job. */
    name: string;
    /** Identifier of the client of this job order. */
    clientId: string;

    /** Priority of this job. */
    priority: TJobPriority;
    /** Submission date and time (ISO formatted string). */
    submission: string;

    /** The executed recipe. */
    recipe: IRecipe;
    /** Parameters for the recipe. */
    parameters: {
        [id:string]: number | boolean | string;
    };

    /** Start date and time (ISO formatted string). */
    start: string;
    /** End date and time (ISO formatted string). */
    end: string;
    /** Duration of the recipe in seconds. */
    duration: number;

    /** Current execution state. */
    state: TTaskState;
    /** Currently executed recipe step. */
    step: string;
    /** Error message if an error has occurred. */
    error: string;

    /** Reports from the executed recipe tasks. */
    steps: { [step: string]: ITaskReport };
}

export interface IJobLogEvent
{
    time: Date;
    module: string;
    level: TLogLevel;
    message: string;
    sender: string;
    clientId: string;
}

export interface ITaskParameters
{
}

/** Result of an executed task step in a recipe.  */
export interface ITaskReport
{
    /** Name of the task. */
    name: string;
    /** Task-specific parameters. */
    parameters: ITaskParameters;

    /** Reports for all tools invoked during the execution of this task. */
    tools: IToolReport[];

    /** Start time of task execution, as ISO-formatted date string. */
    start: string;
    /** End time of task execution, as ISO-formatted date string. */
    end: string;
    /** Duration of task execution in seconds. */
    duration: number;
    /** If this task is part of a sequence, the id of the task step. */
    step?: string;

    state: TTaskState;
    error: string;

    log: Array<{
        time: string;
        level: TLogLevel;
        message: string;
    }>;

    result: { [id:string]: any }
}

export interface IToolOptions
{
    timeout?: number;
}

export interface IToolScript
{
    filePath: string;
    content: string;
}

export type TToolState = "created" | "waiting" | "running" | "done" | "error" | "timeout" | "cancelled";

/** Result of the execution of an external tool. */
export interface IToolReport
{
    name: string;
    executable: string;
    version: string;

    execution: {
        options: IToolOptions;
        script?: IToolScript;
        command: string;
        timeout: number;

        start: string;
        end: string;
        duration: number;

        state: TToolState;
        code: number;
        error: string;

        log: Array<{
            time: string;
            level: string;
            message: string;
        }>;
    };
}

/** Short information about a recipe. */
export interface IRecipeInfo
{
    id: string;
    name: string;
    description?: string;
    version?: string;
}

/** Full recipe.  */
export interface IRecipe extends IRecipeInfo
{
    parameterSchema: object;
    start: string;
    steps: { [name: string]: IRecipeStep }
}

export interface IRecipe
{
    id: string;
    name: string;
    description?: string;
    version?: string;
    parameterSchema: object;
    start: string;
    steps: { [name: string]: IRecipeStep }
}

/** Single step in a recipe. */
export interface IRecipeStep
{
    task: string;
    description: string;
    parameters: ITaskParameters;
    pre?: { [id: string]: string },
    post?: { [id: string]: string },
    success: string | "success" | "failure";
    failure: string | "success" | "failure";
}


export enum MachineState
{
    Idle,
    Busy,
    Disabled,
    Unavailable,
    Error,
}

/** Information about the processing service and the machine it's running on. */
export interface IMachineInfo
{
    id: string;
    name: string;
    address: string;
    state: MachineState;
    jobId: string;
}

