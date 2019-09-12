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

import * as path from "path";
import { promises as fs } from "fs";

import clone from "@ff/core/clone";
import uniqueId from "@ff/core/uniqueId";

import { IDocument, INode, IScene } from "../types/document";
import { IArticle, IMeta } from "../types/meta";
import { ISetup, ITours, ITour } from "../types/setup";

import {
    IModel,
    IAnnotation,
    IDerivative,
    TDerivativeUsage,
    TDerivativeQuality,
    IAsset,
    TAssetType,
    TMapType,
} from "../types/model";

////////////////////////////////////////////////////////////////////////////////

export default class DocumentBuilder
{
    protected static readonly defaultDocument: IDocument = {
        asset: {
            "type": "application/si-dpo-3d.document+json",
            "version": "1.0",
            "generator": "Cook",
            "copyright": "(c) Smithsonian Institution. All rights reserved."
        },
        "scene": 0,
        "scenes": [{
            "name": "Scene",
            "units": "cm",
        }],
    };

    document: IDocument = null;
    baseDir: string = "";

    constructor(baseDir: string, document?: IDocument)
    {
        this.baseDir = baseDir;
        this.document = document ? document : clone(DocumentBuilder.defaultDocument);
    }

    initialize()
    {
        this.document = clone(DocumentBuilder.defaultDocument);
    }

    getMainScene(): IScene
    {
        return this.document.scenes[this.document.scene];
    }

    createNode(parent: INode): INode
    {
        const nodes = this.document.nodes = this.document.nodes || [];
        const children = parent.children = parent.children || [];
        children.push(nodes.length);

        const node: INode = {};
        nodes.push(node);
        return node;
    }

    createRootNode(scene?: IScene): INode
    {
        scene = scene || this.getMainScene();
        const nodes = this.document.nodes = this.document.nodes || [];
        const children = scene.nodes = scene.nodes || [];
        children.push(nodes.length);

        const node: INode = {};
        nodes.push(node);
        return node;
    }

    getOrCreateSetup(scene: IScene): ISetup
    {
        if (scene.setup !== undefined) {
            return this.document.setups[scene.setup];
        }

        const setups = this.document.setups = this.document.setups || [];
        scene.setup = setups.length;

        const setup: ISetup = {};
        setups.push(setup);
        return setup;
    }

    getOrCreateMeta(node: INode | IScene): IMeta
    {
        if (node.meta !== undefined) {
            return this.document.metas[node.meta];
        }

        const metas = this.document.metas = this.document.metas || [];
        node.meta = metas.length;

        const meta: IMeta = {};
        metas.push(meta);
        return meta;
    }

    getOrCreateModel(node: INode): IModel
    {
        if (node.model !== undefined) {
            return this.document.models[node.model];
        }

        const models = this.document.models = this.document.models || [];
        node.model = models.length;

        const model: IModel = {
            units: "cm",
            derivatives: [],
        };

        models.push(model);
        return model;
    }

    findNodesByModel(model: IModel): INode[]
    {
        const nodes = this.document.nodes;
        if (!nodes) {
            return [];
        }

        const models = this.document.models;
        if (!models) {
            return [];
        }

        return nodes.filter(node => models[node.model] === model);
    }

    createArticle(node: IScene | INode, uri: string): IArticle
    {
        const meta = this.getOrCreateMeta(node);
        const articles = meta.articles = meta.articles || [];
        const article: IArticle = {
            id: uniqueId(),
            uri
        };

        articles.push(article);
        return article;
    }

    addArticle(node: IScene | INode, article: IArticle): IArticle
    {
        const meta = this.getOrCreateMeta(node);
        const articles = meta.articles = meta.articles || [];
        articles.push(article);
        return article;
    }

    createAnnotation(model: IModel): IAnnotation
    {
        const annotations = model.annotations = model.annotations || [];
        const annotation: IAnnotation = {
            id: uniqueId()
        };

        annotations.push(annotation);
        return annotation;
    }

    createTour(setup: ISetup, title: string): ITour
    {
        const tours: ITours = setup.tours = setup.tours || [];
        const tour: ITour = {
            title,
            steps: []
        };

        tours.push(tour);
        return tour;
    }

    getOrCreateDerivative(model: IModel, quality: TDerivativeQuality, usage: TDerivativeUsage = "Web3D"): IDerivative
    {
        let derivative = model.derivatives.find(
            derivative => derivative.usage === usage && derivative.quality === quality);

        if (!derivative) {
            derivative = {
                quality,
                usage,
                assets: [],
            };

            model.derivatives.push(derivative);
        }

        return derivative;
    }

    async setModelAsset(derivative: IDerivative, uri: string, numFaces?: number, mapSize?: number): Promise<IAsset>
    {
        return this.setAsset(derivative, "Model", uri).then(asset => {
            if (numFaces > 0) {
                asset.numFaces = numFaces;
            }
            if (mapSize > 0) {
                asset.imageSize = mapSize;
            }

            return asset;
        });
    }

    async setGeometryAsset(derivative: IDerivative, uri: string, numFaces?: number): Promise<IAsset>
    {
        return this.setAsset(derivative, "Geometry", uri).then(asset => {
            if (numFaces > 0) {
                asset.numFaces = numFaces;
            }

            return asset;
        });
    }

    async setTextureAsset(derivative: IDerivative, uri: string, mapType: TMapType,  mapSize?: number): Promise<IAsset>
    {
        return this.setAsset(derivative, "Texture", uri).then(asset => {
            asset.mapType = mapType;
            if (mapSize > 0) {
                asset.imageSize = mapSize;
            }

            return asset;
        });
    }

    async setAsset(derivative: IDerivative, type: TAssetType, uri: string): Promise<IAsset>
    {
        const assetPath = path.resolve(this.baseDir, uri);

        let asset = derivative.assets.find(asset => asset.type === type);

        if (!asset) {
            asset = {
                uri,
                type
            };

            derivative.assets.push(asset);
        }
        else {
            asset.uri = uri;
        }

        return fs.stat(assetPath).then(stats => {
            asset.byteSize = stats.size;
        })
        .catch(() => {})
        .then(() => asset);
    }
}