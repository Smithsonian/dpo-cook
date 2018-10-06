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

import * as fs from "fs";
import * as path from "path";
import * as commentJSON from "comment-json";

import * as Ajv from "ajv";
import { ValidateFunction } from "ajv";
const jsonValidator = new Ajv({ useDefaults: true, allErrors: true });

import { IRecipe, IRecipeInfo } from "common/types";

import globals from "./globals";
import { ConfigurationError } from "./Errors";

////////////////////////////////////////////////////////////////////////////////

type RecipeDict = { [id:string]: IRecipe };

/**
 * Loads and validates recipes. Recipes can be queried by id or name.
 */
export default class RecipeManager
{
    protected recipes: RecipeDict;
    protected validator: ValidateFunction;

    constructor(recipeDir: string)
    {
        this.recipes = {};

        const recipeSchemaFilePath = path.resolve(globals.recipesDir, "schema/recipe.json");
        const recipeSchema = JSON.parse(fs.readFileSync(recipeSchemaFilePath, "utf8"));
        this.validator = jsonValidator.compile(recipeSchema);

        this.loadRecipes(recipeDir);
    }

    /**
     * Returns the recipe with the given id.
     * @param {string} id
     * @returns {IRecipe} The recipe, if found, or null otherwise.
     */
    getRecipeById(id: string): IRecipe
    {
        return this.recipes[id] || null;
    }

    /**
     * Returns the recipe with the given name. If there are multiple recipes with the same name,
     * returns the one with the greatest version number.
     * @param {string} name Recipe name.
     * @returns {IRecipe} The recipe, if found, or null otherwise.
     */
    getRecipeByName(name: string): IRecipe
    {
        const ids = Object.keys(this.recipes);
        const matchingRecipes = [];

        for (let id of ids) {
            const recipe = this.recipes[id];
            if (recipe.name === name) {
                matchingRecipes.push(recipe);
            }
        }

        if (matchingRecipes.length < 1) {
            return null;
        }

        // sort by version number, descending
        matchingRecipes.sort((a, b) => {
            const va = parseFloat(a.version.toString());
            const vb = parseFloat(b.version.toString());
            if (va > vb) return -1;
            if (va < vb) return 1;
            return 0;
        });

        return matchingRecipes[0];
    }

    /**
     * Returns the recipe with the given id or name.
     * @param {string} idOrName id or name of a recipe.
     * @returns {IRecipe} The recipe, if found, or null otherwise.
     */
    getRecipeByIdOrName(idOrName: string): IRecipe
    {
        return this.getRecipeById(idOrName) || this.getRecipeByName(idOrName);
    }

    /**
     * Returns information for the recipe with the given id or name.
     * @param {string} idOrName id or name of a recipe.
     * @returns {IRecipeInfo} Recipe information, if found, or null otherwise.
     */
    getRecipeInfo(idOrName: string): IRecipeInfo
    {
        const recipe = this.getRecipeByIdOrName(idOrName);
        if (!recipe) {
            return null;
        }

        return {
            id: recipe.id,
            name: recipe.name,
            description: recipe.description,
            version: recipe.version
        };
    }

    /**
     * Returns an array with information for each available recipe.
     * @returns {IRecipeInfo[]}
     */
    getRecipeInfoList(): IRecipeInfo[]
    {
        const ids = Object.keys(this.recipes);
        return ids.map(id => this.getRecipeInfo(id));
    }

    /**
     * Loads all available recipes in the given folder.
     * @param {string} recipeDir Directory to load recipes from.
     */
    protected loadRecipes(recipeDir: string)
    {
        const fileNames = fs.readdirSync(recipeDir);
        let count = 0;

        fileNames.forEach(recipeFile => {
            if (path.extname(recipeFile) === ".json") {
                const recipePath = path.resolve(globals.recipesDir, recipeFile);
                let recipe;

                try {
                    const jsonRecipe = fs.readFileSync(recipePath, "utf8");
                    recipe = commentJSON.parse(jsonRecipe, null, true);
                }
                catch(e) {
                    throw new ConfigurationError(`Failed to load/validate recipe file '${recipeFile}': ${e.toString()}`);
                }

                if (!this.validator(recipe)) {
                    console.warn(jsonValidator.errorsText(this.validator.errors, { separator: ", ", dataVar: "recipe" }));
                    throw new ConfigurationError(`failed to validate recipe ${recipeFile}`);
                }
                if (!jsonValidator.validateSchema(recipe.parameterSchema)) {
                    console.warn(jsonValidator.errorsText(null, { separator: ", ", dataVar: "parameterSchema" }));
                    throw new ConfigurationError(`failed to validate parameterSchema of recipe '${recipeFile}'`);
                }

                this.recipes[recipe.id] = recipe as IRecipe;
                count++;

            }
        });

        console.info(`Recipes loaded/validated: ${count}`);
    }
}
