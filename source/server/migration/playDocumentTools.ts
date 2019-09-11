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

import { Dictionary } from "@ff/core/types";

import { IDocument } from "../types/document";
import { IArticle } from "../types/meta";
import { IModel, IAnnotation } from "../types/model";

import DocumentBuilder from "../utils/DocumentBuilder";

import { IPlayAnnotation, IPlayBoxInfo, IPlayContext, IPlaySnapshot, IPlayTour } from "./playTypes";

import { createArticle, fetchArticle } from "./playArticleTools";
import { ITour, ISnapshots } from "../types/setup";

////////////////////////////////////////////////////////////////////////////////

export async function createDocument(context: IPlayContext, info: IPlayBoxInfo): Promise<IDocument>
{
    const builder = new DocumentBuilder(context.baseDir);
    const scene = builder.getMainScene();
    const sceneSetup = builder.getOrCreateSetup(scene);
    const sceneMeta = builder.getOrCreateMeta(scene);
    const todos: Promise<unknown>[] = [];

    let articleIndex = 0;
    const articleByUrl: Dictionary<IArticle> = {};

    // default article
    const articleUrl = info.config["Default Sidebar"].URL;
    if (articleUrl) {
        const article = articleByUrl[articleUrl] = createArticle(context, articleIndex);
        builder.addArticle(sceneMeta, article);
        todos.push(fetchArticle(context, articleUrl, articleIndex++));
    }

    const modelNode = builder.createRootNode();
    const model = builder.getOrCreateModel(modelNode);

    // annotations
    const playAnnotations = info.payload.message.annotations[0].annotations;
    playAnnotations.forEach(playAnnotation => {
        const annotation = builder.createAnnotation(model);
        migrateAnnotation(playAnnotation, annotation);

        const articleUrl = playAnnotation.Link;
        if (articleUrl) {
            let article = articleByUrl[articleUrl];
            if (!article) {
                article = articleByUrl[articleUrl] = createArticle(context, articleIndex);
                todos.push(fetchArticle(context, articleUrl, articleIndex++));
            }

            builder.addArticle(sceneMeta, article);
            annotation.articleId = article.id;
        }
    });

    // tours
    const playTours = info.payload.message.tours;
    playTours.forEach(playTour => {
        const tour = builder.createTour(sceneSetup, playTour.name);
        migrateTour(playTour, tour);

        playTour.snapshots.forEach(snapshot => {
            const articleUrl = snapshot.data["Sidebar Store"]["Sidebar.URL"];
            if (articleUrl) {
                let article = articleByUrl[articleUrl];
                if (!article) {
                    article = articleByUrl[articleUrl] = createArticle(context, articleIndex);
                    todos.push(fetchArticle(context, articleUrl, articleIndex++));
                }

                builder.addArticle(sceneMeta, article);
                // add article id to tour stop
            }
        });
    });

    return Promise.all(todos)
        .then(() => builder.document);
}

function migrateAnnotation(playAnnotation: IPlayAnnotation, annotation: IAnnotation)
{
    annotation.title = playAnnotation.Title;
    annotation.lead = playAnnotation.Body;
    annotation.color = playAnnotation["Stem.Color"];
    annotation.position = playAnnotation["Transform.Position"];
    annotation.direction = playAnnotation["Transform.Rotation"];
}

function migrateTour(playTour: IPlayTour, tour: ITour)
{
    tour.title = playTour.name;
    tour.lead = playTour.description;
}

function migrateSnapshot(playSnapshot: IPlaySnapshot, snapshot: any)
{

}