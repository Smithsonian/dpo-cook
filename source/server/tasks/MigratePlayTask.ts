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

import { Parser, DomHandler, DomUtils } from "htmlparser2";

import fetch from "../utils/fetch";

import Job from "../app/Job";
import Task, { ITaskParameters } from "../app/Task";

import {
    IPlayBoxInfo,
    IPlayBake,
    IPlayPayload,
    IPlayConfig,
    IPlayDescriptor
} from "../migration/playTypes";

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
    static readonly taskName = "MigratePlay";

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

    protected static readonly drupalBaseUrl = "https://3d.si.edu";
    protected static readonly payloadBaseUrl = "https://3d.si.edu/sites/default/files/box_payloads";
    protected static readonly cdnBaseUrl = "https://d39fxlie76wg71.cloudfront.net";

    protected parameters: IMigratePlayTaskParameters;


    constructor(params: IMigratePlayTaskParameters, context: Job)
    {
        super(params, context);
    }

    protected async execute(): Promise<unknown>
    {
        this.result.files = {};

        const playBoxId = this.parameters.boxId;

        const payload = await this.fetchPayload(playBoxId);
        const { bake, config, descriptor } = await this.fetchAssets(playBoxId);

        const infoContent: IPlayBoxInfo = {
            payload,
            bake,
            config,
            descriptor
        };

        const infoFileName = this.result.files["info.json"] = "info.json";
        await this.writeFile(infoFileName, JSON.stringify(infoContent, null, 2));

        return this.fetchArticles(infoContent);
    }

    /**
     * Fetches payload.json and the associated thumbnail and preview images.
     * @param boxId The Play box ID.
     */
    private async fetchPayload(boxId: string): Promise<IPlayPayload>
    {
        const payloadUrl = `${MigratePlayTask.payloadBaseUrl}/${boxId}_payload.json`;

        this.logTaskEvent("debug", `fetching ${payloadUrl}`);
        const payloadContent = await fetch.json(payloadUrl, "GET") as IPlayPayload;
        const payloadFileName = this.result.files["payload.json"] = "payload.json";
        await this.writeFile(payloadFileName, JSON.stringify(payloadContent, null, 2));

        // fetch and write thumbnail image
        this.logTaskEvent("debug", `fetching ${payloadContent.message.pubThumb}`);
        const thumbImage = await fetch.buffer(payloadContent.message.pubThumb, "GET");
        const thumbFileName = this.result.files["image-thumb.jpg"] = "image-thumb.jpg";
        await this.writeFile(thumbFileName, Buffer.from(thumbImage));

        // fetch and write preview image
        this.logTaskEvent("debug", `fetching ${payloadContent.message.pubPreview}`);
        const previewImage = await fetch.buffer(payloadContent.message.pubPreview, "GET");
        const previewFileName = this.result.files["image-preview.jpg"] = "image-preview";
        await this.writeFile(previewFileName, Buffer.from(previewImage));

        return payloadContent;
    }

    /**
     * Fetches the bake.json asset map from CDN, then fetches all assets (original files).
     * Returns the content of the config.json asset.
     * @param boxId The Play box ID.
     */
    private async fetchAssets(boxId: string): Promise<Partial<IPlayBoxInfo>>
    {
        const cdnBaseUrl = MigratePlayTask.cdnBaseUrl;
        const boxBaseUrl = `${cdnBaseUrl}/boxes/${boxId}/`;

        // fetch and write bake.json
        const bakeUrl = boxBaseUrl + "bake.json";
        this.logTaskEvent("debug", `fetching 'bake.json' from ${bakeUrl}`);
        const bakeContent = await fetch.json(bakeUrl, "GET") as IPlayBake;
        const bakeFileName = this.result.files["bake.json"] = "bake.json";
        await this.writeFile(bakeFileName, JSON.stringify(bakeContent, null, 2));

        let configContent: IPlayConfig = null;
        let descriptorContent: IPlayDescriptor = null;

        // fetch and write all assets
        const assetPaths = Object.keys(bakeContent.assets);
        const fetchAssets = assetPaths.map(assetPath => {
            const asset = bakeContent.assets[assetPath];
            const assetUrl = `${cdnBaseUrl}/${asset.files["original"]}`;
            const assetFileName = this.result.files[asset.name] = asset.name;

            this.logTaskEvent("debug", `fetching asset '${assetFileName}' from ${assetUrl}`);

            if (asset.type === "json") {
                return fetch.json(assetUrl, "GET").then(data => {
                    if (asset.name === "config.json") {
                        configContent = data;
                    }
                    if (asset.name === "descriptor.json") {
                        descriptorContent = data;
                    }

                    return this.writeFile(assetFileName, JSON.stringify(data, null, 2))
                });
            }
            else {
                return fetch.buffer(assetUrl, "GET").then(data => this.writeFile(assetFileName, Buffer.from(data)));
            }
        });

        await Promise.all(fetchAssets);

        return {
            bake: bakeContent,
            config: configContent,
            descriptor: descriptorContent
        };
    }

    private async fetchArticles(info: IPlayBoxInfo): Promise<any>
    {
        let articleIndex = 0;
        const articleUrls: { [id:string]: number } = {};

        // default article
        const url = info.config["Default Sidebar"].URL;
        if (url && !articleUrls[url]) {
            articleUrls[url] = articleIndex++;
        }

        // tour articles
        const tours = info.payload.message.tours;
        tours.forEach(tour => {
            tour.snapshots.forEach(snapshot => {
                const sidebarUrl = snapshot.data["Sidebar Store"]["Sidebar.URL"];
                if (sidebarUrl && !articleUrls[sidebarUrl]) {
                    articleUrls[sidebarUrl] = articleIndex++;
                }
            })
        });

        const urls = Object.keys(articleUrls);
        return Promise.all(urls.map(url => this.fetchArticle(url, articleUrls[url])));
    }

    private async fetchArticle(url: string, index: number): Promise<any>
    {
        const pageHtml = await fetch.text(url, "GET");
        const handler = new DomHandler();
        const parser = new Parser(handler);

        parser.write(pageHtml);
        parser.done();

        const dom = handler.dom;

        // find parent of article content
        const contentDiv = DomUtils.findOne(elem =>
                elem.attribs && elem.attribs.class && elem.attribs.class.indexOf("region-content") >=0,
        dom, true);

        if (!contentDiv) {
            throw new Error("Article content not found (no 'region-content' class)");
        }

        // remove article body-enclosing div (class "threed-sidebar-article-body")
        const bodyDiv = DomUtils.findOne(elem =>
            elem.attribs && elem.attribs.class && elem.attribs.class.indexOf("threed-sidebar-article-body") >= 0,
        contentDiv.children, true);

        if (bodyDiv) {
            const parent: any = bodyDiv.parent;
            bodyDiv.children.forEach(child => DomUtils.appendChild(parent, child));
            DomUtils.removeElement(bodyDiv);
        }

        let imageIndex = 0;
        const imageUrls: { [id:string]: string } = {};

        DomUtils.findOne(elem => {
            // download images
            if (elem.name === "img" && elem.attribs && elem.attribs.src) {
                const src = elem.attribs.src;
                const imageUrl = src.startsWith("http") ? src : MigratePlayTask.drupalBaseUrl + src;
                const imageExtension = imageUrl.split(".").pop();
                const imageFileName = `article-${index}-image-${imageIndex}.${imageExtension}`;

                elem.attribs.src = imageFileName;
                imageUrls[imageUrl] = imageFileName;
                imageIndex++;
            }

            // remove additional classes from all nodes
            if (elem.attribs && elem.attribs.class) {
                delete elem.attribs.class;
            }

            return false;
        }, contentDiv.children, true);

        // fetch all images
        const urls = Object.keys(imageUrls);
        const promises = urls.map(url => fetch.buffer(url, "GET").then(image => {
            this.writeFile(imageUrls[url], Buffer.from(image))
        }));

        // write article HTML content
        const contentHtml = DomUtils.getInnerHTML(contentDiv);
        promises.push(this.writeFile(`article-${index}.html`, contentHtml));

        await Promise.all(promises);
    }
}