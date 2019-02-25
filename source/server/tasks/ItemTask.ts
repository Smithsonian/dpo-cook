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

import { promises as fs } from "fs";
import * as path from "path";

import clone from "@ff/core/clone";

import Job from "../app/Job";
import Task, { ITaskParameters } from "../app/Task";

import { IItem, TUnitType, TDerivativeUsage, TDerivativeQuality, IAsset, TAssetType } from "../utils/item";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[ItemTask]]. */
export interface IItemTaskParameters extends ITaskParameters
{
    /** File name of the item to be created/modified. */
    itemFile?: string;
    /** File name with meta data to be embedded in the item file. */
    metaDataFile?: string;
    /** Units to be set for the item's model. */
    units?: TUnitType;
    /** Usage of the derivative to be added or modified. */
    derivativeUsage?: TDerivativeUsage;
    /** Quality of the derivative to be added or modified. */
    derivativeQuality?: TDerivativeQuality;
    /** File name of the model (.gltf, .glb) to be added to the derivative. */
    modelFile?: string;
    /** File name of the mesh (.obj, .ply) to be added to the derivative. */
    meshFile?: string;
    /** File name of the diffuse map to be added to the derivative. */
    diffuseMapFile?: string;
    /** File name of the occlusion map to be added to the derivative. */
    occlusionMapFile?: string;
    /** File name of the normal map to be added to the derivative. */
    normalMapFile?: string;
    /** Number of faces. Will be added to model and geometry assets. */
    numFaces?: number;
    /** Map size. Will be added to model, image, and texture assets. */
    mapSize?: number;
}

/**
 * Creates and modifies item.json descriptor files, as used by the Smithsonian Voyager 3D Explorer.
 * If the value of a parameter is an empty string, the corresponding item.json data is removed.
 *
 * Parameters: [[IItemTaskParameters]].
 */
export default class ItemTask extends Task
{
    static readonly description = "Creates and modifies item.json descriptor files.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            itemFile: { type: "string", minLength: 1 },
            metaDataFile: { type: "string" },
            units: { type: "string", enum: [ "mm", "cm", "m", "in", "ft", "yd" ] },
            derivativeUsage: { type: "string", enum: [ "Web2D", "Web3D", "Print", "Editorial" ] },
            derivativeQuality: { type: "string", enum: [ "Thumb", "Low", "Medium", "High", "Highest", "LOD", "Stream"] },
            modelFile: { type: "string" },
            meshFile: { type: "string" },
            diffuseMapFile: { type: "string" },
            occlusionMapFile: { type: "string" },
            normalMapFile: { type: "string" },
            numFaces: { type: "integer" },
            mapSize: { type: "integer" },
        },
        required: [
            "itemFile",
        ],
        additionalProperties: false,
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(ItemTask.parameterSchema);

    protected static readonly defaultItem: IItem = {
        info: {
            type: "application/si-dpo-3d.item+json",
            copyright: "(c) Smithsonian Institution, all rights reserved",
            generator: "Cook Item Parser",
            version: "1.3",
        },
        model: {
            units: "cm",
            derivatives: [],
        }
    };

    constructor(params: IItemTaskParameters, context: Job)
    {
        super(params, context);
    }

    run(): Promise<void>
    {
        this.startTask();

        return this.readOrCreateItem()
            .then(item => this.modifyItem(item))
            .then(item => this.writeItem(item))
            .then(() => this.endTask(null, "done"))
            .catch(error => {
                this.endTask(error, "error");
                throw error;
            });
    }

    protected readOrCreateItem(): Promise<IItem>
    {
        const params = this.parameters as IItemTaskParameters;
        const itemFilePath = path.resolve(this.context.jobDir, params.itemFile);

        return fs.readFile(itemFilePath, "utf8").then(json => {
            // successfully read file: parse JSON and return item
            return JSON.parse(json) as IItem;
        }).catch(err => {
            // error while reading the item file: create new item
            return clone(ItemTask.defaultItem);
        });
    }

    protected modifyItem(item: IItem): Promise<IItem>
    {
        const params = this.parameters as IItemTaskParameters;
        const model = item.model;
        const derivatives = item.model.derivatives;

        // model units
        if (params.units) {
            model.units = params.units;
        }

        // derivative operations
        const hasFile = params.modelFile || params.meshFile ||
            params.diffuseMapFile || params.occlusionMapFile || params.normalMapFile;

        const usage = params.derivativeUsage || "Web3D";
        const quality = params.derivativeQuality || "Medium";

        // find a derivative based on usage and quality
        let derivative = derivatives.find(derivative =>
            derivative.usage === usage && derivative.quality === quality);

        // derivative specified and exists, but no files given: remove derivative
        if (derivative && params.derivativeQuality && !hasFile) {
            derivatives.splice(derivatives.indexOf(derivative), 1);
            return Promise.resolve(item);
        }

        // no asset files given, no further modifications
        if (!hasFile) {
            return Promise.resolve(item);
        }

        // files given but derivative not found: create one
        if (!derivative) {
            derivative = { usage, quality, assets: [] };
            derivatives.push(derivative);
        }

        const assets = derivative.assets;

        // add/modify model file asset
        const mods: Promise<any>[] = [];

        if (params.modelFile) {
            mods.push(this.updateAsset(assets, "Model", params.modelFile).then(asset => {
                if (params.numFaces > 0) {
                    asset.numFaces = params.numFaces;
                }
                if (params.mapSize > 0) {
                    asset.imageSize = params.mapSize;
                }
            }));
        }
        if (params.meshFile) {
            mods.push(this.updateAsset(assets, "Geometry", params.meshFile).then(asset => {
                if (params.numFaces > 0) {
                    asset.numFaces = params.numFaces;
                }
            }));
        }
        if (params.diffuseMapFile) {
            mods.push(this.updateAsset(assets, "Texture", params.diffuseMapFile).then(asset => {
                asset.mapType = "Color";
                if (params.mapSize > 0) {
                    asset.imageSize = params.mapSize;
                }
            }));
        }
        if (params.occlusionMapFile) {
            mods.push(this.updateAsset(assets, "Texture", params.occlusionMapFile).then(asset => {
                asset.mapType = "Occlusion";
                if (params.mapSize > 0) {
                    asset.imageSize = params.mapSize;
                }
            }));
        }
        if (params.normalMapFile) {
            mods.push(this.updateAsset(assets, "Texture", params.normalMapFile).then(asset => {
                asset.mapType = "Normal";
                if (params.mapSize > 0) {
                    asset.imageSize = params.mapSize;
                }
            }));
        }

        if (params.metaDataFile) {
            const metaDataPath = path.resolve(this.context.jobDir, params.metaDataFile);
            mods.push(fs.readFile(metaDataPath, "utf8").then(json => {
                console.log(json);
                const meta = JSON.parse(json);
                console.log(meta);
                const keys = Object.keys(meta);
                if (keys.length > 0) {
                    item.meta = item.meta || {};
                    keys.forEach(key => item.meta[key] = meta[key]);
                }
            }));
        }

        return Promise.all(mods).then(() => item);
    }

    protected updateAsset(assets: IAsset[], type: TAssetType, fileName: string): Promise<IAsset>
    {
        const filePath = path.resolve(this.context.jobDir, fileName);

        return fs.stat(filePath).then(stats => {
            let asset = assets.find(asset => asset.type === type);

            if (!asset) {
                asset = { uri: "", type };
                assets.push(asset);
            }

            asset.uri = fileName;
            asset.byteSize = stats.size;
            return asset;
        });
    }

    protected writeItem(item: IItem): Promise<void>
    {
        const params = this.parameters as IItemTaskParameters;
        const itemFilePath = path.resolve(this.context.jobDir, params.itemFile);
        const json = JSON.stringify(item);

        return fs.writeFile(itemFilePath, json, "utf8");
    }
}