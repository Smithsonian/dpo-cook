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
import * as commentJSON from "comment-json";

import * as Ajv from "ajv";
import { ValidateFunction } from "ajv";


export function create<T>(schemaOrPath: any, useDefaults: boolean): (filePath: string) => T
{
    if (typeof schemaOrPath === "string") {
        try {
            schemaOrPath = JSON.parse(fs.readFileSync(schemaOrPath, "utf8"));
        }
        catch (e) {
            throw new Error(`failed to load schema from '${schemaOrPath}': ${e.message}`);
        }
    }

    const jsonValidator = new Ajv({ useDefaults: true, allErrors: true });
    const validate: ValidateFunction = jsonValidator.compile(schemaOrPath);

    return function(filePath: string): T {
        let json, data;

        try {
            json = fs.readFileSync(filePath, "utf8");
        }
        catch (e) {
            throw new Error(`failed to load '${filePath}': ${e.message}`);
        }

        try {
            data = commentJSON.parse(json, null, true);
        }
        catch (e) {
            throw new Error(`failed to parse '${filePath}': ${e.message}`);
        }

        if (!validate(data)) {
            const text = jsonValidator.errorsText(validate.errors, { separator: ", " });
            const errorText = `failed to validate '${filePath}': ${text}`;
            throw new Error(errorText);
        }

        return data as T;
    }
}

export function validate<T>(filePath: string, schemaOrPath: any, useDefaults: boolean): T
{
    const validate = create<T>(schemaOrPath, useDefaults);
    return validate(filePath);
}