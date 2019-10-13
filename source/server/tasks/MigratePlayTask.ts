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
import * as mkdirp from "mkdirp";
import * as filenamify from "filenamify";
import * as deepEqual from "deep-equal";
import { Parser, DomHandler, DomUtils } from "htmlparser2";
import * as THREE from "three";

import { Dictionary } from "@ff/core/types";
import uniqueId from "@ff/core/uniqueId";

import Job from "../app/Job";
import Task, { ITaskParameters } from "../app/Task";

import { IMeshSmithInspection } from "../types/inspection";
import { IInspectMeshTaskParameters } from "./InspectMeshTask";
import { IConvertImageTaskParameters } from "./ConvertImageTask";
import { IWebAssetTaskParameters } from "./WebAssetTask";

import DocumentBuilder from "../utils/DocumentBuilder";
import { convertUnits, playToUnitType } from "../utils/unitTools";
import fetch from "../utils/fetch";

import { IDocument } from "../types/document";
import { IState, ITour } from "../types/setup";
import { IArticle } from "../types/meta";
import { IAnnotation, IModel } from "../types/model";

import {
    IPlayBoxInfo,
    IPlayBake,
    IPlayConfig,
    IPlayDescriptor,
    IPlayPayload,
    IPlayAnnotation,
    IPlaySnapshot,
    IPlayTour, IPlayPart,
} from "../migration/playTypes";

////////////////////////////////////////////////////////////////////////////////

const curves = [
    "Linear",         // 0
    "EaseQuad",       // 1
    "EaseInQuad",     // 2
    "EaseOutQuad",    // 3
    "EaseCubic",      // 4
    "EaseInCubic",    // 5
    "EaseOutCubic",   // 6
    "EaseQuart",      // 7
    "EaseInQuart",    // 8
    "EaseOutQuart",   // 9
    "EaseQuint",      // 10
    "EaseInQuint",    // 11
    "EaseOutQuint",   // 12
    "EaseSine",       // 13
    "EaseInSine",     // 14
    "EaseOutSine",    // 15
];

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[MigratePlayTask]]. */
export interface IMigratePlayTaskParameters extends ITaskParameters
{
    /** The ID of the Play box to migrate. */
    boxId: string;
    /** The style of converted annotations. */
    annotationStyle: string;
    /** Migrates the custom color of annotations. */
    migrateAnnotationColor: boolean;
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
 * Generated assets, keys in result.files
 * - `document`: Voyager document
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

    protected static readonly boxDir = "box";
    protected static readonly articlesDir = "articles";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            boxId: { type: "integer" },
            annotationStyle: { type: "string", enum: [ "Standard", "Extended", "Circle" ], default: "Circle" },
            migrateAnnotationColor: { type: "boolean", default: false },
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

    protected get boxDir() {
        return MigratePlayTask.boxDir;
    }
    protected get articlesDir() {
        return MigratePlayTask.articlesDir;
    }


    constructor(params: IMigratePlayTaskParameters, context: Job)
    {
        super(params, context);
    }

    protected async execute(): Promise<unknown>
    {
        this.result.files = {};
        const params = this.parameters;

        // create subdirectories for assets and articles
        this.logTaskEvent("debug", "creating subdirectories for assets and articles");
        mkdirp(this.getFilePath(this.boxDir));
        mkdirp(this.getFilePath(this.articlesDir));

        // fetch play box assets and articles
        this.logTaskEvent("debug", `fetching assets for Play box #${params.boxId}`);
        const info = await this.fetchPlayBox(params.boxId);

        if (this.cancelRequested) {
            return;
        }

        // create document, fetch article HTML files and images
        this.logTaskEvent("debug", `creating SVX document for Play box #${params.boxId}`);
        const document = await this.createDocument(info);

        const documentFileName = "scene.svx.json";
        this.logTaskEvent("debug", `writing document to ${documentFileName}`);
        this.result.files["scene:document"] = documentFileName;
        return fs.writeFile(this.getFilePath(documentFileName), JSON.stringify(document, null, 2));
    }

    ////////////////////////////////////////////////////////////////////////////////
    // FETCH BOX ASSETS

    /**
     * Fetches all assets from the given play box, excluding articles. Writes and returns
     * an 'info.json' aggregated object containing the box id, payload, bake, descriptor, and config info.
     * @param boxId The ID of the play box to fetch.
     */
    async fetchPlayBox(boxId: string): Promise<IPlayBoxInfo>
    {
        const payload = await this.fetchPayload(boxId);
        const bake = await this.fetchBake(boxId);
        const { config, descriptor } = await this.fetchAssets(boxId, bake);

        const info: IPlayBoxInfo = {
            id: boxId,
            payload,
            bake,
            descriptor,
            config
        };

        const infoFileName = this.result.files["box:info.json"] = this.boxDir + "/info.json";
        const infoFilePath = this.getFilePath(infoFileName);

        return fs.writeFile(infoFilePath, JSON.stringify(info, null, 2))
        .then(() => info);
    }

    /**
     * Fetches and writes the 'bake.json' file for the given play box ID.
     * @param boxId The ID of the play box to fetch.
     */
    async fetchBake(boxId: string): Promise<IPlayBake>
    {
        const boxBaseUrl = `${this.parameters.cdnBaseUrl}/boxes/${boxId}/`;

        // fetch and write bake.json
        const bakeUrl = boxBaseUrl + "bake.json";
        const bakeContent = await fetch.json(bakeUrl, "GET") as IPlayBake;
        const bakeFileName = this.result.files["box:bake.json"] = this.boxDir + "/bake.json";
        const bakeFilePath = this.getFilePath(bakeFileName);

        return fs.writeFile(bakeFilePath, JSON.stringify(bakeContent, null, 2))
        .then(() => bakeContent);
    }

    /**
     * Fetches payload.json and the associated thumbnail and preview images.
     * @param boxId The ID of the play box to fetch.
     */
    async fetchPayload(boxId: string): Promise<IPlayPayload>
    {
        const payloadUrl = `${this.parameters.payloadBaseUrl}/${boxId}_payload.json`;

        const payloadContent = await fetch.json(payloadUrl, "GET") as IPlayPayload;
        const payloadFileName = this.result.files["box:payload.json"] = this.boxDir + "/payload.json";
        const payloadFilePath = this.getFilePath(payloadFileName);

        // fetch and write thumbnail image
        const thumbImage = await fetch.buffer(payloadContent.message.pubThumb, "GET");
        const thumbFileName = this.result.files["box:image-thumb.jpg"] = this.boxDir + "/image-thumb.jpg";
        const thumbFilePath = this.getFilePath(thumbFileName);

        // fetch and write preview image
        const previewImage = await fetch.buffer(payloadContent.message.pubPreview, "GET");
        const previewFileName = this.result.files["box:image-preview.jpg"] = this.boxDir + "/image-preview.jpg";
        const previewFilePath = this.getFilePath(previewFileName);

        return Promise.all([
            fs.writeFile(payloadFilePath, JSON.stringify(payloadContent, null, 2)),
            fs.writeFile(thumbFilePath, Buffer.from(thumbImage)),
            fs.writeFile(previewFilePath, Buffer.from(previewImage))
        ]).then(() => payloadContent);
    }

    /**
     * Fetches all assets described in the 'bake.json' of a given Play box.
     * @param boxId The ID of the play box to fetch.
     * @param bake The bake file content
     */
    async fetchAssets(boxId: string, bake: IPlayBake): Promise<{ config: IPlayConfig, descriptor: IPlayDescriptor }>
    {
        let playConfig: IPlayConfig = null;
        let playDescriptor: IPlayDescriptor = null;

        // fetch and write all assets
        const assetPaths = Object.keys(bake.assets);
        const fetchAssets = assetPaths.map(assetPath => {
            const asset = bake.assets[assetPath];
            const assetUrl = `${this.parameters.cdnBaseUrl}/${asset.files["original"]}`;
            const assetFileName = `${this.boxDir}/${asset.name}`;
            const assetFilePath = this.getFilePath(assetFileName);
            this.result.files[`box:${assetFileName}`] = assetFileName;

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

        // additionally fetch 'nodeData.json' from 'config.json' asset
        const configFiles = bake.assets["config.json"].files;
        const nodeDataUrl = `${this.parameters.cdnBaseUrl}/${configFiles["nodeData"]}`;

        fetchAssets.push(fetch.json(nodeDataUrl, "GET").then(data => {
            const nodeDataFileName = `${this.boxDir}/nodeData.json`;
            this.result.files["box:nodeData.json"] = nodeDataFileName;
            const nodeDataFilePath = this.getFilePath(nodeDataFileName);
            return fs.writeFile(nodeDataFilePath, JSON.stringify(data, null, 2));
        }));

        return Promise.all(fetchAssets)
        .then(() => ({
            config: playConfig,
            descriptor: playDescriptor
        }));
    }

    ////////////////////////////////////////////////////////////////////////////////
    // DOCUMENT, SCENE, SETUP

    async createDocument(info: IPlayBoxInfo): Promise<IDocument>
    {
        const builder = new DocumentBuilder(this.context.jobDir);
        builder.document.asset["migration"] = `Play Box #${info.id}`;

        const scene = builder.getMainScene();
        const sceneSetup = builder.getOrCreateSetup(scene);

        // determine annotation scale factor from scene dimensions
        const modelBoundingBox = await this.createModels(info, builder.document);
        const size = new THREE.Vector3();
        modelBoundingBox.getSize(size);
        const modelRadius = size.length() * 0.5;
        const annotationScale = modelRadius / 18;

        // get first model
        const model = builder.document.models[0];
        const modelNode = builder.findNodesByModel(model)[0];

        // factor to convert from PLAY magic space (radius = 8) to Voyager scene units
        const playScaleFactor = convertUnits(modelRadius / 8, model.units, scene.units);

        // bookkeeping for HTML article conversion and annotations
        let articleIndex = 0;
        const articleByUrl: Dictionary<IArticle> = {};
        const tasks: Promise<unknown>[] = [];
        const annotationIds: Dictionary<string> = {};

        // convert all annotations and assign to first model
        const playAnnotations = info.payload.message.annotations[0].annotations;
        console.log(`createDocument - converting ${playAnnotations.length} annotations`);

        playAnnotations.forEach(playAnnotation => {
            const annotation = builder.createAnnotation(model);
            this.convertAnnotation(playAnnotation, annotation, annotationScale);
            annotationIds[playAnnotation.index] = annotation.id;

            // offset the annotation by the model's translation
            const p = annotation.position;
            const t = model.translation;
            p[0] += t[0]; p[1] += t[1]; p[2] += t[2];

            const articleUrl = playAnnotation.Link;
            if (articleUrl) {
                let article = articleByUrl[articleUrl];

                if (!article) {
                    article = articleByUrl[articleUrl] = this.createArticle(articleIndex);
                    tasks.push(this.fetchArticle(article, articleUrl, articleIndex++));
                    builder.addArticle(modelNode, article);
                }

                annotation.articleId = article.id;
            }
        });

        // convert scene settings (camera, etc.)
        this.convertScene(info, builder, playScaleFactor);

        // tours
        const playTours = info.payload.message.tours;

        console.log(`createDocument - converting ${playTours.length} tours`);

        const tourTasks = playTours.map((tour, index) => this.findAnimatedTourProps(tour, index));
        await Promise.all(tourTasks);

        playTours.forEach((playTour, tourIndex) => {
            const tour = builder.createTour(sceneSetup, playTour.name);
            this.convertTour(playTour, tour);

            playTour.snapshots.forEach(playSnapshot => {
                const articleUrl = playSnapshot.data["Sidebar Store"]["Sidebar.URL"];
                let article: IArticle = null;

                if (articleUrl) {
                    article = articleByUrl[articleUrl];
                    if (!article) {
                        article = articleByUrl[articleUrl] = this.createArticle(articleIndex);
                        tasks.push(this.fetchArticle(article, articleUrl, articleIndex++));
                    }

                    builder.addArticle(scene, article);
                }

                const state = builder.createSnapshot(sceneSetup, tour, playSnapshot.name);
                const articleId = article ? article.id : "";
                this.convertSnapshot(playSnapshot, annotationIds, articleId, tour, state, playScaleFactor);
            });
        });

        // default article, add to scene
        const articleUrl = info.config["Default Sidebar"].URL;
        if (articleUrl) {
            let article = articleByUrl[articleUrl];

            if (!article) {
                article = articleByUrl[articleUrl] = this.createArticle(articleIndex);
                tasks.push(this.fetchArticle(article, articleUrl, articleIndex++));
                builder.addArticle(scene, article);
            }
        }

        console.log(`createDocument - fetching ${tasks.length} articles`);

        return Promise.all(tasks)
        .then(() => builder.document);
    }

    convertScene(info: IPlayBoxInfo, builder: DocumentBuilder, playScaleFactor: number)
    {
        const scene = builder.getMainScene();
        const meta = builder.getOrCreateMeta(scene);
        const setup = builder.getOrCreateSetup(scene);

        // set title of experience
        meta.collection = meta.collection || {};
        meta.collection["title"] = info.descriptor.name;

        // create camera
        // TODO: Disabled - needs updated merge strategy in Voyager
        // let camera: ICamera = builder.getCamera(0);
        //
        // if (!camera) {
        //     const cameraNode = builder.createRootNode(scene);
        //     camera = builder.getOrCreateCamera(cameraNode);
        // }
        //
        // camera.type = "perspective";
        // camera.perspective = {
        //     yfov: 45,
        //     znear: 0.1,
        //     zfar: 100000
        // };

        const cam = info.config["Camera - Curator Settings"];
        const offset = cam["Camera.Offset"];
        const distance = cam["Camera.Distance"];
        const orbitX = cam["Camera.Orientation.Y"];
        const orbitY = cam["Camera.Orientation.X"];

        setup.navigation = {
            autoZoom: true,
            enabled: true,
            type: "Orbit",
            orbit: {
                offset: [ offset[0] * playScaleFactor, offset[1] * playScaleFactor, (offset[2] + distance) * playScaleFactor ],
                orbit: [ orbitX, orbitY, 0 ],
                "minOrbit": [-90, null, null],
                "maxOrbit": [90, null, null],
                "minOffset": [null, null, 0.1],
                "maxOffset": [null, null, 10000]
            },
        };
    }

    ////////////////////////////////////////////////////////////////////////////////
    // ANNOTATIONS, TOURS

    convertAnnotation(playAnnotation: IPlayAnnotation, annotation: IAnnotation, scale: number)
    {
        annotation.marker = (playAnnotation.index + 1).toString();
        annotation.title = playAnnotation.Title;
        annotation.lead = playAnnotation.Body;

        annotation.style = this.parameters.annotationStyle || "Circle";

        if (this.parameters.migrateAnnotationColor) {
            annotation.color = playAnnotation["Stem.Color"];
        }

        annotation.scale = annotation.style === "Circle" ? 10 : scale;

        annotation.position = playAnnotation["Transform.Position"];

        const rotation = new THREE.Vector3();
        rotation.fromArray(playAnnotation["Transform.Rotation"]);
        rotation.multiplyScalar(THREE.Math.DEG2RAD);

        const euler = new THREE.Euler();
        euler.setFromVector3(rotation, "YXZ"); // in Play: ZXY

        const direction = new THREE.Vector3(0, 1, 0);
        direction.applyEuler(euler);

        annotation.direction = direction.toArray();
    }

    async findAnimatedTourProps(tour: IPlayTour, index: number)
    {
        const snapshots = tour.snapshots;
        const first = snapshots[0];
        if (!first) {
            return Promise.resolve();
        }

        const firstStoreKeys = Object.keys(first.data);

        const components: Dictionary<Dictionary<boolean>> = {};

        for (let i = 1; i < snapshots.length; ++i) {
            const snapshot = snapshots[i];
            firstStoreKeys.forEach(storeKey => {
                const propKeys = Object.keys(first.data[storeKey]);
                propKeys.forEach(propKey => {
                    if (!deepEqual(snapshot.data[storeKey][propKey], first.data[storeKey][propKey])) {
                        const props = components[storeKey] = components[storeKey] || {};
                        props[propKey] = true;
                    }
                });
            });
        }

        console.log(`\n---------- TOUR: ${tour.name}: ANIMATED KEYS/PROPS ----------`);
        firstStoreKeys.forEach(storeKey => {
            if (components[storeKey]) {
                const animatedProps = Object.keys(components[storeKey]);
                if (animatedProps.length > 0) {
                    console.log(storeKey);
                    animatedProps.forEach(prop => console.log(`    ${prop}`));
                }
            }
        });

        const tourPropsFileName = `t${index}-${filenamify(tour.name)}-animated-props.json`;
        return fs.writeFile(this.getFilePath(tourPropsFileName), JSON.stringify(components, null, 2));
    }

    convertTour(playTour: IPlayTour, tour: ITour)
    {
        tour.title = playTour.name;
        tour.lead = playTour.description;
    }

    convertSnapshot(playSnapshot: IPlaySnapshot, annotationIds: Dictionary<string>, articleId: string, tour: ITour, state: IState, playScaleFactor: number)
    {
        state.duration = playSnapshot.transition.duration;
        state.threshold = playSnapshot.transition.switch;
        state.curve = curves[playSnapshot.transition.curve];

        const camera = playSnapshot.data["Camera Store"];
        const annotations = playSnapshot.data["Annotation Store"];
        const activeAnnotationId = annotationIds[annotations["Annotation.WhichOpen"]] || "";

        const orbit = [
            camera["Camera.Orientation"][1], // 1 = Pitch (X)
            camera["Camera.Orientation"][0], // 2 = Yaw (Y)
            camera["Camera.Orientation"][2], // 3 = Roll (Z)
        ];
        const offset = [
            camera["Camera.Offset"][0] * playScaleFactor,
            camera["Camera.Offset"][1] * playScaleFactor,
            (camera["Camera.Offset"][2] + camera["Camera.Distance"]) * playScaleFactor,
        ];

        const readerEnabled = false;
        const annotationsVisible = annotations["Annotation.On"];
        const activeAnnotation = activeAnnotationId;
        const activeTags = "";
        const shader = 0;
        const exposure = 1;

        state.values = [
            readerEnabled,
            articleId,
            orbit,
            offset,
            annotationsVisible,
            activeAnnotation,
            activeTags,
            shader,
            exposure,
        ];
    }

    ////////////////////////////////////////////////////////////////////////////////
    // ARTICLES

    /**
     * Creates and returns an IArticle object.
     * @param index The index to be used for the local article and image files.
     */
    createArticle(index: number): IArticle
    {
        const articleIndex = index.toString().padStart(2, "0");
        const articleFileName = `${this.articlesDir}/article-${articleIndex}.html`;

        return {
            id: uniqueId(),
            uri: articleFileName
        };
    }

    /**
     * Fetches the HTML document from the given url and transforms/rewrites it to the article folder.
     * Also fetches and writes all images referenced in the article.
     * @param article The article to augment with title and lead.
     * @param url The URL of the article to be fetched.
     * @param index The index to be used for naming the article.
     * @returns file path of the fetched article.
     */
    async fetchArticle(article: IArticle, url: string, index: number): Promise<unknown>
    {
        const articleIndex = index.toString().padStart(2, "0");

        console.log(`fetchArticle - fetching HTML from ${url}`);
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

        const title = DomUtils.findOne(elem => elem.name === "h1",
            contentDiv.children, true);

        const titleText = title && DomUtils.getText(title);
        article.title = titleText || `Article No. ${index + 1}`;

        let imageIndex = 0;
        const imageUrls: Dictionary<string> = {};

        DomUtils.findOne(elem => {
            // download images
            if (elem.name === "img" && elem.attribs && elem.attribs.src) {
                const src = elem.attribs.src;
                const imageUrl = src.startsWith("http") ? src : this.parameters.drupalBaseUrl + src;
                const imageName = filenamify(decodeURIComponent(src.split("/").pop()));
                const imageFileName = `article-${articleIndex}-${imageName}`;
                const imageAssetPath = `${this.articlesDir}/${imageFileName}`;
                this.result.files[`scene:${imageAssetPath}`] = imageAssetPath;

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
        const promises: Promise<unknown>[] = urls.map(url => {
            console.log(`fetchArticle - fetching image from ${url}`);
            return fetch.buffer(url, "GET").then(image => {
                const imageFileName = imageUrls[url];
                const imageFilePath = this.getFilePath(imageFileName);
                console.log(`fetchArticle - writing image to ${imageFilePath}`);
                return fs.writeFile(imageFilePath, Buffer.from(image))
            });
        });

        // write article HTML content
        const contentHtml = DomUtils.getInnerHTML(contentDiv);
        const articleFileName = `${this.articlesDir}/article-${articleIndex}.html`;
        this.result.files[`scene:${articleFileName}`] = articleFileName;
        const articleFilePath = this.getFilePath(articleFileName);
        promises.push(fs.writeFile(articleFilePath, contentHtml));

        return Promise.all(promises);
    }

    ////////////////////////////////////////////////////////////////////////////////
    // MODELS

    async createModels(info: IPlayBoxInfo, document: IDocument): Promise<THREE.Box3>
    {
        const builder = new DocumentBuilder(this.context.jobDir, document);
        const scene = builder.getMainScene();
        const models: IModel[] = [];

        const corner = new THREE.Vector3();
        const sceneBoundingBox = new THREE.Box3();
        sceneBoundingBox.makeEmpty();

        const tasks = info.descriptor.parts.map((part, index) => {
            const node = builder.createRootNode(scene);
            node.name = part.name;

            const model = builder.getOrCreateModel(node);
            models.push(model);
            model.units = playToUnitType(info.descriptor.units);

            let inspection: IMeshSmithInspection = null;

            return this.getBoundingBox(part)
            .then(_inspection => {
                inspection = _inspection;
                model.boundingBox = inspection.scene.geometry.boundingBox;
                corner.fromArray(model.boundingBox.min);
                sceneBoundingBox.expandByPoint(corner);
                corner.fromArray(model.boundingBox.max);
                sceneBoundingBox.expandByPoint(corner);

                // TODO: debug only, write inspection report
                return fs.writeFile(this.getFilePath(`p${index}-inspection.json`), JSON.stringify(inspection, null, 2));
            })
            // create thumb quality web asset
            .then(() => this.reduceMaps(part, index, inspection, 512))
            .then(marker => this.createWebAsset(part, index, marker))
            .then(modelAssetPath => {
                const derivative = builder.getOrCreateDerivative(model, "Thumb", "Web3D");
                return builder.setAsset(derivative, "Model", modelAssetPath);
            })
            .then(asset => {
                asset.numFaces = inspection.scene.statistics.numFaces;
            })
            // create low quality web asset
            .then(() => this.reduceMaps(part, index, inspection, 1024))
            .then(marker => this.createWebAsset(part, index, marker))
            .then(modelAssetPath => {
                const derivative = builder.getOrCreateDerivative(model, "Low", "Web3D");
                return builder.setAsset(derivative, "Model", modelAssetPath);
            })
            .then(asset => {
                asset.numFaces = inspection.scene.statistics.numFaces;
            })
            // create medium quality web asset
            .then(() => this.reduceMaps(part, index, inspection, 2048))
            .then(marker => this.createWebAsset(part, index, marker))
            .then(modelAssetPath => {
                const derivative = builder.getOrCreateDerivative(model, "Medium", "Web3D");
                return builder.setAsset(derivative, "Model", modelAssetPath);
            })
            .then(asset => {
                asset.numFaces = inspection.scene.statistics.numFaces;
            })
            // create high quality web asset
            .then(() => this.reduceMaps(part, index, inspection, 4096))
            .then(marker => this.createWebAsset(part, index, marker))
            .then(modelAssetPath => {
                const derivative = builder.getOrCreateDerivative(model, "High", "Web3D");
                return builder.setAsset(derivative, "Model", modelAssetPath);
            })
            .then(asset => {
                asset.numFaces = inspection.scene.statistics.numFaces;
            });
        });

        return Promise.all(tasks).then(() => {
            const center = new THREE.Vector3();
            sceneBoundingBox.getCenter(center);
            center.multiplyScalar(-1);
            models.forEach(model => model.translation = center.toArray());
            return sceneBoundingBox;
        });
    }

    async getBoundingBox(part: IPlayPart): Promise<IMeshSmithInspection>
    {
        const inspectMeshParams: IInspectMeshTaskParameters = {
            meshFile: `${this.boxDir}/${part.files.mesh}`,
            tool: "MeshSmith"
        };

        const inspectionTask = this.context.manager.createTask("InspectMesh", inspectMeshParams, this.context);
        return inspectionTask.run().then(() => inspectionTask.report.result["inspection"] as IMeshSmithInspection);
    }

    async reduceMaps(part: IPlayPart, index: number, stats: IMeshSmithInspection, mapSize: number): Promise<string>
    {
        const numFaces = stats.scene.statistics.numFaces;
        const kFaces = (numFaces / 1000).toFixed(0) + "k";
        const marker = `${kFaces}-${mapSize}`;

        const files = part.files;
        const srcImages = [];

        files.diffuse && srcImages.push({ quality: 79, name: files.diffuse });
        files.occlusion && srcImages.push({ quality: 59, name: files.occlusion });
        files.normal && srcImages.push({ quality: 89, name: files.normal });

        const tasks = srcImages.map(srcImage => {
            // compose source and destination image path
            const srcImagePath = `${this.boxDir}/${srcImage.name}`;
            const { base, extension } = this.splitFileName(srcImagePath);
            const dstImagePath = `p${index}-${base}-${marker}.${extension}`;
            this.result.files[`temp:${dstImagePath}`] = dstImagePath;

            // parameters for image conversion/size reduction
            const params: IConvertImageTaskParameters = {
                inputImageFile: srcImagePath,
                outputImageFile: dstImagePath,
                quality: srcImage.quality,
                resize: mapSize
            };

            // execute conversion job
            return this.context.manager.createTask("ConvertImage", params, this.context).run();
        });

        return Promise.all(tasks).then(() => marker);
    }

    async createWebAsset(part: IPlayPart, index: number, marker: string): Promise<string>
    {
        const modelAssetPath = `p${index}-${filenamify(part.name)}-${marker}.glb`;
        this.result.files[`scene:${modelAssetPath}`] = modelAssetPath;

        const webAssetTaskParams: IWebAssetTaskParameters = {
            outputFile: modelAssetPath,
            meshFile: `${this.boxDir}/${part.files.mesh}`,
            objectSpaceNormals: true,
            useCompression: true,
            compressionLevel: 6,
            embedMaps: true,
            writeBinary: true
        };

        if (part.files.diffuse) {
            const { path, base, extension } = this.splitFileName(part.files.diffuse);
            webAssetTaskParams.diffuseMapFile = `${path}p${index}-${base}-${marker}.${extension}`;
        }
        if (part.files.occlusion) {
            const { path, base, extension } = this.splitFileName(part.files.occlusion);
            webAssetTaskParams.occlusionMapFile = `${path}p${index}-${base}-${marker}.${extension}`;
        }
        if (part.files.normal) {
            const { path, base, extension } = this.splitFileName(part.files.normal);
            webAssetTaskParams.normalMapFile = `${path}p${index}-${base}-${marker}.${extension}`;
        }

        const webAssetTask = this.context.manager.createTask("WebAsset", webAssetTaskParams, this.context);
        return webAssetTask.run().then(() => modelAssetPath);
    }

    splitFileName(fileName: string): { path: string, base: string, extension: string }
    {
        const pathParts = fileName.split("/");
        const name = pathParts.pop();
        let path = pathParts.join("/");
        if (path) {
            path += "/";
        }

        const nameParts = name.split(".");
        const extension = nameParts.pop();
        const base = nameParts.join(".");


        return { path, base, extension };
    }
}