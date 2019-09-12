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

import fetch from "../utils/fetch";

import {
    IPlayContext,
    IPlayBake,
    IPlayBoxInfo,
    IPlayConfig,
    IPlayDescriptor,
    IPlayPayload
} from "./playTypes";

////////////////////////////////////////////////////////////////////////////////

/**
 * Fetches all assets from the given play box, excluding articles. Writes and returns
 * an 'info.json' aggregated object containing the box id, payload, bake, descriptor, and config info.
 * @param context The configuration context.
 * @param boxId The ID of the play box to fetch.
 */
export async function fetchPlayBox(context: IPlayContext, boxId: string): Promise<IPlayBoxInfo>
{
    const payload = await fetchPayload(context, boxId);
    const bake = await fetchBake(context, boxId);
    const { config, descriptor } = await fetchAssets(context, boxId, bake);

    const info: IPlayBoxInfo = {
        id: boxId,
        payload,
        bake,
        descriptor,
        config
    };

    const infoFileName = context.files["info.json"] = context.boxDir + "/info.json";
    const infoFilePath = path.resolve(context.job.jobDir, infoFileName);

    return fs.writeFile(infoFilePath, JSON.stringify(info, null, 2))
        .then(() => info);
}

/**
 * Fetches and writes the 'bake.json' file for the given play box ID.
 * @param context The configuration context.
 * @param boxId The ID of the play box to fetch.
 */
export async function fetchBake(context: IPlayContext, boxId: string): Promise<IPlayBake>
{
    const boxBaseUrl = `${context.cdnBaseUrl}/boxes/${boxId}/`;

    // fetch and write bake.json
    const bakeUrl = boxBaseUrl + "bake.json";
    const bakeContent = await fetch.json(bakeUrl, "GET") as IPlayBake;
    const bakeFileName = context.files["bake.json"] = context.boxDir + "/bake.json";
    const bakeFilePath = path.resolve(context.job.jobDir, bakeFileName);

    return fs.writeFile(bakeFilePath, JSON.stringify(bakeContent, null, 2))
        .then(() => bakeContent);
}

/**
 * Fetches payload.json and the associated thumbnail and preview images.
 * @param context The configuration context.
 * @param boxId The ID of the play box to fetch.
 */
export async function fetchPayload(context: IPlayContext, boxId: string): Promise<IPlayPayload>
{
    const payloadUrl = `${context.payloadBaseUrl}/${boxId}_payload.json`;

    const payloadContent = await fetch.json(payloadUrl, "GET") as IPlayPayload;
    const payloadFileName = context.files["payload.json"] = context.boxDir + "/payload.json";
    const payloadFilePath = path.resolve(context.job.jobDir, payloadFileName);

    // fetch and write thumbnail image
    const thumbImage = await fetch.buffer(payloadContent.message.pubThumb, "GET");
    const thumbFileName = context.files["image-thumb.jpg"] = "image-thumb.jpg";
    const thumbFilePath = path.resolve(context.job.jobDir, thumbFileName);

    // fetch and write preview image
    const previewImage = await fetch.buffer(payloadContent.message.pubPreview, "GET");
    const previewFileName = context.files["image-preview.jpg"] = "image-preview.jpg";
    const previewFilePath = path.resolve(context.job.jobDir, previewFileName);

    return Promise.all([
        fs.writeFile(payloadFilePath, JSON.stringify(payloadContent, null, 2)),
        fs.writeFile(thumbFilePath, Buffer.from(thumbImage)),
        fs.writeFile(previewFilePath, Buffer.from(previewImage))
    ]).then(() => payloadContent);
}

/**
 * Fetches all assets described in the 'bake.json' of a given Play box.
 * @param context The configuration context.
 * @param boxId The ID of the play box to fetch.
 * @param bake The bake file content
 */
export async function fetchAssets(context: IPlayContext, boxId: string, bake: IPlayBake):
    Promise<{ config: IPlayConfig, descriptor: IPlayDescriptor }>
{
    let playConfig: IPlayConfig = null;
    let playDescriptor: IPlayDescriptor = null;

    // fetch and write all assets
    const assetPaths = Object.keys(bake.assets);
    const fetchAssets = assetPaths.map(assetPath => {
        const asset = bake.assets[assetPath];
        const assetUrl = `${context.cdnBaseUrl}/${asset.files["original"]}`;
        const assetFileName = `${context.boxDir}/${asset.name}`;
        const assetFilePath = path.resolve(context.job.jobDir, assetFileName);
        context.files[assetFileName] = assetFileName;

        if (asset.type === "json") {
            return fetch.json(assetUrl, "GET").then(data => {
                if (asset.name === "config.json") {
                    playConfig = data;
                }
                if (asset.name === "descriptor.json") {
                    playDescriptor = data;
                }

                return fs.writeFile(assetFilePath, JSON.stringify(data, null, 2))
            });
        }
        else {
            return fetch.buffer(assetUrl, "GET")
                .then(data => fs.writeFile(assetFilePath, Buffer.from(data)));
        }
    });

    return Promise.all(fetchAssets)
        .then(() => ({
            config: playConfig,
            descriptor: playDescriptor
        }));
}
