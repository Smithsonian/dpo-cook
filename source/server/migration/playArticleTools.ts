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
import * as filenamify from "filenamify";
import { Parser, DomHandler, DomUtils } from "htmlparser2";

import { Dictionary } from "@ff/core/types";
import uniqueId from "@ff/core/uniqueId";

import fetch from "../utils/fetch";

import { IArticle } from "../types/meta";

import { IPlayContext } from "./playTypes";

////////////////////////////////////////////////////////////////////////////////

/**
 * Creates and returns an IArticle object.
 * @param context The configuration context.
 * @param index The index to be used for the local article and image files.
 */
export function createArticle(context: IPlayContext, index: number): IArticle
{
    const articleIndex = index.toString().padStart(2, "0");
    const articleFileName = `${context.articleDir}/article-${articleIndex}.html`;

    return {
        id: uniqueId(),
        uri: articleFileName
    };
}

/**
 * Fetches the HTML document from the given url and transforms/rewrites it to the article folder.
 * Also fetches and writes all images referenced in the article.
 * @param context The configuration context.
 * @param url The URL of the article to be fetched.
 * @param index The index to be used for naming the article.
 * @returns file path of the fetched article.
 */
export async function fetchArticle(context: IPlayContext, url: string, index: number): Promise<unknown>
{
    const articleIndex = index.toString().padStart(2, "0");

    const pageHtml = await fetch.text(url, "GET");

    // parse the article's HTML content
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

    // remove article body-enclosing div (class "threed-sidebar-article-body"), then re-parent children
    const bodyDiv = DomUtils.findOne(elem =>
        elem.attribs && elem.attribs.class && elem.attribs.class.indexOf("threed-sidebar-article-body") >= 0,
        contentDiv.children, true);

    if (bodyDiv) {
        const parent: any = bodyDiv.parent;
        bodyDiv.children.forEach(child => DomUtils.appendChild(parent, child));
        DomUtils.removeElement(bodyDiv);
    }

    let imageIndex = 0;
    const imageUrls: Dictionary<string> = {};

    DomUtils.findOne(elem => {
        // download images
        if (elem.name === "img" && elem.attribs && elem.attribs.src) {
            const src = elem.attribs.src;
            const imageUrl = src.startsWith("http") ? src : context.drupalBaseUrl + src;
            const imageName = filenamify(decodeURIComponent(src.split("/").pop()));
            const imageFileName = `article-${articleIndex}-${imageName}`;
            const imageAssetPath = `${context.articleDir}/${imageFileName}`;
            context.files[imageAssetPath] = imageAssetPath;

            elem.attribs.src = imageFileName; // relative to location of html file
            imageUrls[imageUrl] = imageAssetPath;
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
    const promises = urls.map(url => fetch.buffer(url, "GET")
        .then(image => {
            const imageFileName = imageUrls[url];
            const imageFilePath = path.resolve(context.baseDir, imageFileName);
            return fs.writeFile(imageFilePath, Buffer.from(image))
        }));

    // write article HTML content
    const contentHtml = DomUtils.getInnerHTML(contentDiv);
    const articleFileName = `${context.articleDir}/article-${articleIndex}.html`;
    context.files[articleFileName] = articleFileName;
    const articleFilePath = path.resolve(context.baseDir, articleFileName);
    promises.push(fs.writeFile(articleFilePath, contentHtml));

    return Promise.all(promises);
}
