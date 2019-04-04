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
import { URL } from "url";
import fetch from "../utils/fetch";

import Job from "../app/Job";
import Task, { ITaskParameters } from "../app/Task";

import { IPlayBake, IPlayPayloadInfo } from "../utils/playTypes";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[MigratePlayTask]]. */
export interface IMigratePlayTaskParameters extends ITaskParameters
{
    /** Play box id. */
    boxId: string;
    /** Base name for extracted files. */
    baseName?: string;
}

/**
 * Fetches Play box content including models, maps, annotations
 * and articles, and converts it to Voyager items/presentations.
 *
 * Parameters: [[IMigratePlayTaskParameters]].
 */
export default class MigratePlayTask extends Task
{
    static readonly description = "Fetches Play box content including models, maps, annotations " +
                                  "and articles, and converts it to Voyager items/presentations.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            boxId: { type: "integer" },
            baseName: { type: "string" }
        },
        required: [
            "boxId"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(MigratePlayTask.parameterSchema);

    static readonly playDataUrl = "https://legacy.3d.si.edu";
    static readonly playPayloadLocation = "https://3d.si.edu/sites/default/files/box_payloads/";

    constructor(params: IMigratePlayTaskParameters, context: Job)
    {
        super(params, context);
    }

    async run(): Promise<void>
    {
        const params = this.parameters as IMigratePlayTaskParameters;
        const boxId = params.boxId;
        const baseName = params.baseName || "";
        const resultFiles: any = this.result.files = {};

        const payloadURL = `${MigratePlayTask.playPayloadLocation}${boxId}_payload.json`;
        const payload = await fetch.json(payloadURL, "GET") as IPlayPayloadInfo;

        resultFiles.payload = `${baseName}payload.json`;
        await this.writeFile(resultFiles.payload, JSON.stringify(payload, null, 2));

        // fetch and write thumbnail image
        const thumbImage = await fetch.buffer(payload.message.pubThumb, "GET");
        resultFiles.thumbImage = `${baseName}image-thumb.jpg`;
        await this.writeFile(resultFiles.thumbImage, Buffer.from(thumbImage));

        // fetch and write preview image
        const previewImage = await fetch.buffer(payload.message.pubPreview, "GET");
        resultFiles.previewImage = `${baseName}image-preview.jpg`;
        await this.writeFile(resultFiles.previewImage, Buffer.from(previewImage));

        // compose box base URL
        const parts = payload.message.pubThumb.split("/");
        const boxesIndex = parts.indexOf("boxes");
        const cdnBaseURL = parts.slice(0, boxesIndex).join("/") + "/";
        const boxBaseURL = cdnBaseURL + `boxes/${boxId}/`;

        // fetch and write bake.json
        const bake = await fetch.json(boxBaseURL + "bake.json", "GET") as IPlayBake;
        resultFiles.bake = `${baseName}bake.json`;
        await this.writeFile(resultFiles.bake, JSON.stringify(bake, null, 2));

        // fetch and write all assets
        const assetKeys = Object.keys(bake.assets);
        const promises = assetKeys.map(key => {
            const asset = bake.assets[key];
            const assetURL = `${cdnBaseURL}${asset.files["original"]}`;
            const fileName = `${baseName}${asset.name}`;
            resultFiles[asset.name] = fileName;

            if (asset.type === "json") {
                return fetch.json(assetURL, "GET").then(data => this.writeFile(fileName, JSON.stringify(data, null, 2)));
            }
            else {
                return fetch.buffer(assetURL, "GET").then(data => this.writeFile(fileName, Buffer.from(data)));
            }
        });

        await Promise.all(promises);

    }
}