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
import * as cloneDeep from "clone-deep";
import * as jsonata from "jsonata";

import * as Ajv from "ajv";
const jsonValidator = new Ajv({ useDefaults: true, allErrors: true });
jsonValidator.addFormat("file", value => true);

import { IRecipe, ITaskReport, TaskState } from "common/types";

import Job from "../app/Job";
import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Recipe task execution report */
export interface IRecipeReport
{
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
    state: TaskState;
    /** Currently executed recipe step. */
    step: string;
    /** Error message if an error has occurred. */
    error: string;

    /** Reports from the executed recipe tasks. */
    steps: { [step: string]: ITaskReport };
}

/** Parameters for [[RecipeTask]]. */
export interface IRecipeTaskParameters extends ITaskParameters
{
    /** The recipe to be executed. */
    recipe: IRecipe;
    /** Set of parameters for the recipe. */
    parameters: TRecipeParameters;
}

export type TRecipeParameters = { [id:string]: number | boolean | string };
type TRecipeVariables = { [id:string]: number | boolean | string | [] | object };

////////////////////////////////////////////////////////////////////////////////

/**
 * Executes a recipe as a sequence of tasks. Execution order depends on success
 * or failure of each task. Task execution is fully parameterized. Each recipe
 * provides a global set of parameters that can be used to control and
 * orchestrate the various tasks.
 *
 * Parameters: [[IRecipeTaskParameters]]
 */
export default class RecipeTask extends Task
{
    static readonly taskName = "Recipe";

    static readonly description = "Executes a recipe as a sequence of tasks.";

    static readonly parameterSchema: object = {
        type: "object",
        properties: {
            recipe: { type: "object" },
            parameters: { type: "object" },
            report: { type: "object" }
        },
        required: [
            "recipe",
            "parameters"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(RecipeTask.parameterSchema);

    // reserved step name for terminating a recipe successfully
    protected static readonly successToken = "__SUCCESS__";
    // reserved step name for terminating a recipe with error
    protected static readonly failureToken = "__FAILURE__";

    protected recipe: IRecipe;
    protected recipeDidFail: boolean;
    protected currentTask: Task;

    constructor(params: IRecipeTaskParameters, context: Job)
    {
        super(params, context);

        this.recipe = cloneDeep(params.recipe);
        this.recipeDidFail = false;
        this.currentTask = null;

        if (!context.data.report) {
            context.data.report = this.createReport(params.recipe, params.parameters);
        }

        if (!context.data.jsonata) {
            context.data.jsonata = {};
        }

        // validate recipe parameters and use defaults for missing parameters
        // make result available as input for jsonata expressions
        const input = this.validateRecipeParameters(params.recipe, params.parameters);
        input.result = {};
        this.configureJsonata(input);
    }

    protected get recipeReport() {
        return this.context.data.report;
    }

    protected async execute(): Promise<unknown>
    {
        this.recipeDidFail = false;
        return this.executeStep(this.recipe.start);
    }

    async cancel(): Promise<unknown>
    {
        if (this.currentTask) {
            this.currentTask.cancel();
        }

        return super.cancel();
    }

    protected async willStart(): Promise<unknown>
    {
        const report = this.recipeReport;
        report.start = this.report.start;
        report.state = "running";

        return Promise.resolve();
    }

    protected async didFinish(): Promise<unknown>
    {
        const report = this.recipeReport;
        report.end = this.report.end;
        report.duration = this.report.duration;
        report.state = this.report.state;
        report.error = this.report.error;

        if (report.state === "done") {
            report.step = "";
        }

        return Promise.resolve();
    }

    protected executeStep(stepName: string, err?: Error): Promise<void>
    {
        // if a cancellation request is pending, resolve immediately
        if (this.cancelRequested) {
            return Promise.resolve();
        }
        // if the recipe already failed, reject immediately
        if (this.recipeDidFail) {
            return Promise.reject(err);
        }

        if (!stepName) {
            const message = "empty or undefined recipe step name, did you forget to put name in single quotes?";
            this.logTaskEvent("error", message);
            this.recipeDidFail = true;
            return Promise.reject(new Error(message));
        }

        // if we have the final success token, resolve immediately
        if (stepName === RecipeTask.successToken) {
            return Promise.resolve();
        }
        // if we have the final failure token, reject immediately
        if (stepName === RecipeTask.failureToken) {
            this.recipeDidFail = true;
            return Promise.reject(err);
        }

        const step = this.recipe.steps[stepName];
        if (!step) {
            const message = `recipe step not found: ${stepName}`;
            this.logTaskEvent("error", message);
            this.recipeDidFail = true;
            return Promise.reject(new Error(message));
        }

        const description = step.description;
        this.logTaskEvent("info", `next step: '${stepName}', ${description || "(no description)"}`);

        // jsonata user variables (input) and factory functions/variables (bindings)
        const input = this.context.data.jsonata.input;
        const bindings = this.context.data.jsonata.bindings;

        bindings.result = {};
        const taskParams = {};

        const report = this.recipeReport;
        report.step = step.task + (description ? ": " + description : "");

        let task;
        try {
            // parse skip expression if exists
            const skip = step.skip ? this.parseExpression(step.skip, `${stepName}.skip`) : false;

            if (skip) {
                this.logTaskEvent("info", `step '${stepName}' skipped (skip expression resolved to true)`);

                // execute success step
                const successStep = this.parseExpression(step.success, `${stepName}.success`);
                return this.executeStep(successStep);
            }

            // parse pre-step expressions
            this.parseRecursive(step.pre, input, `${stepName}.pre`);

            // parse parameter expressions
            this.parseRecursive(step.parameters, taskParams, `${stepName}.parameters`);

            // create task and validate parameters against the task's parameter schema
            task = this.currentTask = this.context.manager.createTask(step.task, taskParams, this.context);
        }
        catch(error) {
            this.logTaskEvent("error", `step '${stepName}': ${error.message}`);
            this.recipeDidFail = true;
            return Promise.reject(error);
        }

        report.step = task.name + (description ? ": " + description : "");
        report.steps[stepName] = task.report;

        // debug output table of validated task parameters
        console.debug(`\nRecipeTask.executeStep - Task '${task.name}' - Validated Parameters\n`);
        console.debug(this.dumpProperties(task.report.parameters));

        return task.run()
            .then(() => {
                this.currentTask = null;

                if (this.cancelRequested) {
                    return Promise.resolve();
                }

                // make result of last step available in jsonata via $result
                bindings.result = task.result;

                // parse post-step expressions
                this.parseRecursive(step.post, input, `${stepName}.post`);

                // execute next step in case of success
                const successStep = this.parseExpression(step.success, `${stepName}.success`);
                return this.executeStep(successStep);
            })
            .catch((err) => {
                this.currentTask = null;

                // execute next step in case of failure
                const failureStep = this.parseExpression(step.failure, `${stepName}.failure`);
                return this.executeStep(failureStep, err);
            });
    }

    protected validateRecipeParameters(recipe: IRecipe, parameters: TRecipeParameters): TRecipeVariables
    {
        const validatedParams = cloneDeep(parameters);

        if (!jsonValidator.validate(recipe.parameterSchema, validatedParams)) {
            throw new Error(
                "invalid recipe parameters; " +
                jsonValidator.errorsText(null, { separator: ", ", dataVar: "parameters" })
            );
        }

        // debug output table of validated recipe parameters
        console.debug(`\nRecipeTask.validateRecipeParameters - '${recipe.name}'`);
        console.debug(this.dumpProperties(validatedParams));

        return validatedParams;
    }

    protected parseExpression(expression: string, propertyPath: string): any
    {
        const {
            input,
            bindings
        } = this.context.data.jsonata;

        try {
            return jsonata(expression).evaluate(input, bindings);
        }
        catch (error) {
            const message = `JSONata evaluation error in ${propertyPath}="${expression}": ${error.message}`;
            this.logTaskEvent("error", message);
            throw new Error(message);
        }
    }

    protected parseRecursive(source: {}, target: {}, propertyPath: string)
    {
        for (let key in source) {
            const sourceProp = source[key];
            let targetProp = target[key];

            const sourcePropType = typeof sourceProp;
            const targetIsArray = Array.isArray(target);
            const propertyKeyPath = propertyPath + "." + key;

            if (sourcePropType === "object" && sourceProp !== null) {
                const sourcePropIsArray = Array.isArray(sourceProp);
                const targetPropIsArray = Array.isArray(targetProp);

                if (typeof targetProp !== "object" || !targetProp) {
                    targetProp = target[key] = sourcePropIsArray ? [] : {};
                }
                else if (sourcePropIsArray && !targetPropIsArray) {
                    targetProp = target[key] = [];
                }
                else if (!sourcePropIsArray && targetPropIsArray) {
                    targetProp = target[key] = {};
                }

                this.parseRecursive(sourceProp, targetProp, propertyKeyPath);
            }
            else if (sourcePropType === "string") {
                // if expression is string, parse it with JSONata
                const result = this.parseExpression(sourceProp, propertyKeyPath);

                // if result is undefined, discard it, undefined is not a valid JSON value
                if (result !== undefined) {
                    if (targetIsArray) {
                        (target as any).push(result);
                    }
                    else {
                        target[key] = result;
                    }
                }
            }
            else if (sourceProp !== undefined) {
                // if expression is not a string/object, but defined, it is likely a number or boolean;
                // so assign it directly to the target property
                if (targetIsArray) {
                    (target as any).push(sourceProp);
                }
                else {
                    target[key] = sourceProp;
                }
            }
        }
    }

    protected createReport(recipe: IRecipe, parameters: TRecipeParameters): IRecipeReport
    {
        return {
            recipe,
            parameters,

            start: "",
            end: "",
            duration: 0,

            state: "created",
            step: "",
            error: "",

            steps: {}
        }
    }

    protected configureJsonata(input: TRecipeVariables)
    {
        const data = this.context.data;

        // JSONata input
        data.jsonata.input = input;

        // PREDEFINED JSONATA VARIABLES AND FUNCTIONS

        // current working directory
        const jobDir = this.context.jobDir;
        // current directory
        const currentDir = process.cwd();

        // returns the first argument evaluating to true, undefined otherwise
        const firstTrue = function() {
            for (let i = 0, n = arguments.length; i < n; ++i) {
                if (arguments[i]) {
                    return arguments[i];
                }
            }
            return undefined;
        };

        // returns a "thousands" string from a number, e.g. for 5000 returns "5k"
        const k = function(n) {
            return Math.trunc(n / 1000).toString() + "k";
        };
        // file base name without path and extension
        const baseName = fileName =>
            path.basename(fileName, path.extname(fileName));
        // file base name without path and extension
        const basePath = filePath =>
            path.resolve(path.dirname(filePath), path.basename(filePath, path.extname(filePath)));
        // file extension
        const extName = fileName =>
            path.extname(fileName);

        // file base name with annotated mesh size
        const baseMeshName = (fileName, numFaces) =>
            baseName(fileName) + '-' + k(numFaces);
        // file base name with annotated mesh and map size
        const baseMeshMapName = (fileName, numFaces, mapSize) =>
            baseName(fileName) + '-' + k(numFaces) + '-' + mapSize;

        // return true if file exists in path
        const fileExists = function(fileName) {
            let exists = false;

            const filePath = path.resolve(jobDir, fileName);
            if (fs.existsSync(filePath)) {
                exists = true;
            }
            return exists;
        };

        // JSONata variable and function bindings
        data.jsonata.bindings = {
            success: RecipeTask.successToken,
            failure: RecipeTask.failureToken,
            result: {},
            jobDir,
            currentDir,
            firstTrue,
            k,
            baseName,
            basePath,
            extName,
            baseMeshName,
            baseMeshMapName,
            fileExists
        }
    }
}
