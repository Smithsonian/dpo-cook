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

import * as fs from "fs-extra";
import * as path from "path";
import * as mkdirp from "mkdirp";

import Job from "../app/Job";
import Task, { ITaskParameters } from "../app/Task";

import { IPlayContext } from "../migration/playTypes";

import { fetchPlayBox } from "../migration/playBoxTools";
import { createDocument } from "../migration/playDocumentTools";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[MigratePlayTask]]. */
export interface IMigratePlayTaskParameters extends ITaskParameters
{
    /** The ID of the Play box to migrate. */
    boxId: string;
    /** The URL of the Drupal CMS. */
    drupalBaseUrl: string;
    /** The URL of the Drupal folder with box payloads. */
    payloadBaseUrl: string;
    /** The base URL of the Play CDN. */
    cdnBaseUrl: string;
}

/**
 * Fetches Play box content including models, maps, annotations
 * and articles, and converts it to Voyager items/presentations.
 *
 * Parameters: [[IMigratePlayTaskParameters]].
 */
export default class MigratePlayTask extends Task
{
    static readonly taskName = "MigratePlay";

    static readonly description = "Fetches Play box content including models, maps, annotations, " +
                                  "and articles, and converts it to a Voyager experience.";

    protected static readonly drupalBaseUrl = "https://3d.si.edu";
    protected static readonly payloadBaseUrl = "https://3d.si.edu/sites/default/files/box_payloads";
    protected static readonly cdnBaseUrl = "https://d39fxlie76wg71.cloudfront.net";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            boxId: { type: "integer" },
            drupalBaseUrl: { type: "string", default: MigratePlayTask.drupalBaseUrl },
            payloadBaseUrl: { type: "string", default: MigratePlayTask.payloadBaseUrl },
            cdnBaseUrl: { type: "string", default: MigratePlayTask.cdnBaseUrl },
        },
        required: [
            "boxId"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(MigratePlayTask.parameterSchema);

    protected parameters: IMigratePlayTaskParameters;


    constructor(params: IMigratePlayTaskParameters, context: Job)
    {
        super(params, context);
    }

    protected async execute(): Promise<unknown>
    {
        this.result.files = {};
        const params = this.parameters;

        const context: IPlayContext = {
            job: this.context,
            boxDir: "box",
            articleDir: "articles",
            drupalBaseUrl: params.drupalBaseUrl,
            payloadBaseUrl: params.payloadBaseUrl,
            cdnBaseUrl: params.cdnBaseUrl,
            files: this.result.files
        };

        // create subdirectories for assets and articles
        this.logTaskEvent("debug", "creating subdirectories for assets and articles");
        mkdirp(path.resolve(context.job.jobDir, context.boxDir));
        mkdirp(path.resolve(context.job.jobDir, context.articleDir));

        // fetch play box assets and articles
        this.logTaskEvent("debug", `fetching assets for Play box #${params.boxId}`);
        const info = await fetchPlayBox(context, params.boxId);

        if (this.cancelRequested) {
            return;
        }

        // create document, fetch article HTML files and images
        this.logTaskEvent("debug", `creating SVX document for Play box #${params.boxId}`);
        const document = await createDocument(context, info);

        const documentFileName = "document.svx.json";
        this.logTaskEvent("debug", `writing document to ${documentFileName}`);
        context.files[documentFileName] = documentFileName;
        return fs.writeFile(path.resolve(context.job.jobDir, documentFileName), JSON.stringify(document, null, 2));
    }
}