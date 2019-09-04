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

import { URL } from "url";
import fetch from "../utils/fetch";

import Job from "../app/Job";
import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[MigrateLegacyTask]]. */
export interface IMigrateLegacyTaskParameters extends ITaskParameters
{
    /** Legacy model id. */
    modelId: string;
}

/**
 * Fetches Legacy Viewer content including models, maps, annotations
 * and articles, and converts it to Voyager items/presentations.
 *
 * Parameters: [[IMigrateLegacyTaskParameters]].
 */
export default class MigrateLegacyTask extends Task
{
    static readonly description = "Fetches Legacy Viewer content including models, maps, annotations " +
                                  "and articles, and converts it to Voyager items/presentations.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            modelId: { type: "string", minLength: 1 }
        },
        required: [
            "modelId"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(MigrateLegacyTask.parameterSchema);

    static readonly legacyViewerUrl = "https://legacy.3d.si.edu";

    constructor(params: IMigrateLegacyTaskParameters, context: Job)
    {
        super(params, context);
    }

    protected async execute(): Promise<unknown>
    {
        const params = this.parameters as IMigrateLegacyTaskParameters;
        const modelId = params.modelId;

        const modelInfoURL = `${MigrateLegacyTask.legacyViewerUrl}/modelinfo/${modelId}`;
        const modelInfo = await fetch.json(modelInfoURL, "GET");

        this.logTaskEvent("info", modelInfo);

        return Promise.resolve();
    }
}