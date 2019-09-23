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
import * as THREE from "three";

import { playToUnitType } from "../utils/unitTools";
import DocumentBuilder from "../utils/DocumentBuilder";
import { IDocument, TUnitType } from "../types/document";

import { IPlayBoxInfo, IPlayContext, IPlayPart } from "./playTypes";
import { IWebAssetTaskParameters } from "../tasks/WebAssetTask";
import { IInspectMeshTaskParameters } from "../tasks/InspectMeshTask";
import { IBoundingBox, IModel } from "../types/model";
import { IMeshSmithInspection } from "../types/inspection";
import { IConvertImageTaskParameters } from "../tasks/ConvertImageTask";

////////////////////////////////////////////////////////////////////////////////

export async function createModels(context: IPlayContext, info: IPlayBoxInfo, document: IDocument): Promise<THREE.Box3>
{
    const builder = new DocumentBuilder(context.job.jobDir, document);
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

        return getBoundingBox(context, part)
            .then(_inspection => {
                inspection = _inspection;
                model.boundingBox = inspection.scene.geometry.boundingBox;
                corner.fromArray(model.boundingBox.min);
                sceneBoundingBox.expandByPoint(corner);
                corner.fromArray(model.boundingBox.max);
                sceneBoundingBox.expandByPoint(corner);

                // TODO: debug only, write inspection report
                return fs.writeFile(path.resolve(context.job.jobDir, `p${index}-inspection.json`), JSON.stringify(inspection, null, 2));
            })
            // create thumb quality web asset
            .then(() => reduceMaps(context, part, index, inspection, 512))
            .then(marker => createWebAsset(context, part, index, marker))
            .then(modelAssetPath => {
                const derivative = builder.getOrCreateDerivative(model, "Thumb", "Web3D");
                return builder.setAsset(derivative, "Model", modelAssetPath);
            })
            .then(asset => {
                asset.numFaces = inspection.scene.statistics.numFaces;
            })
            // create low quality web asset
            .then(() => reduceMaps(context, part, index, inspection, 1024))
            .then(marker => createWebAsset(context, part, index, marker))
            .then(modelAssetPath => {
                const derivative = builder.getOrCreateDerivative(model, "Low", "Web3D");
                return builder.setAsset(derivative, "Model", modelAssetPath);
            })
            .then(asset => {
                asset.numFaces = inspection.scene.statistics.numFaces;
            })
            // create medium quality web asset
            .then(() => reduceMaps(context, part, index, inspection, 2048))
            .then(marker => createWebAsset(context, part, index, marker))
            .then(modelAssetPath => {
                const derivative = builder.getOrCreateDerivative(model, "Medium", "Web3D");
                return builder.setAsset(derivative, "Model", modelAssetPath);
            })
            .then(asset => {
                asset.numFaces = inspection.scene.statistics.numFaces;
            })
            // create high quality web asset
            .then(() => reduceMaps(context, part, index, inspection, 4096))
            .then(marker => createWebAsset(context, part, index, marker))
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

async function getBoundingBox(context: IPlayContext, part: IPlayPart): Promise<IMeshSmithInspection>
{
    const inspectMeshParams: IInspectMeshTaskParameters = {
        meshFile: `${context.boxDir}/${part.files.mesh}`,
        tool: "MeshSmith"
    };

    const inspectionTask = context.job.manager.createTask("InspectMesh", inspectMeshParams, context.job);
    return inspectionTask.run().then(() => inspectionTask.report.result["inspection"] as IMeshSmithInspection);
}

async function reduceMaps(context: IPlayContext, part: IPlayPart, index: number, stats: IMeshSmithInspection, mapSize: number): Promise<string>
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
        const srcImagePath = `${context.boxDir}/${srcImage.name}`;
        const { base, extension } = splitFileName(srcImagePath);
        const dstImagePath = `p${index}-${base}-${marker}.${extension}`;
        context.files[dstImagePath] = dstImagePath;

        // parameters for image conversion/size reduction
        const params: IConvertImageTaskParameters = {
            inputImageFile: srcImagePath,
            outputImageFile: dstImagePath,
            quality: srcImage.quality,
            resize: mapSize
        };

        // execute conversion job
        return context.job.manager.createTask("ConvertImage", params, context.job).run();
    });

    return Promise.all(tasks).then(() => marker);
}

async function createWebAsset(context: IPlayContext, part: IPlayPart, index: number, marker: string): Promise<string>
{
    const modelAssetPath = `p${index}-${filenamify(part.name)}-${marker}.glb`;
    context.files[modelAssetPath] = modelAssetPath;

    const webAssetTaskParams: IWebAssetTaskParameters = {
        outputFile: modelAssetPath,
        meshFile: `${context.boxDir}/${part.files.mesh}`,
        objectSpaceNormals: true,
        useCompression: true,
        compressionLevel: 6,
        embedMaps: true,
        writeBinary: true
    };

    if (part.files.diffuse) {
        const { path, base, extension } = splitFileName(part.files.diffuse);
        webAssetTaskParams.diffuseMapFile = `${path}p${index}-${base}-${marker}.${extension}`;
    }
    if (part.files.occlusion) {
        const { path, base, extension } = splitFileName(part.files.occlusion);
        webAssetTaskParams.occlusionMapFile = `${path}p${index}-${base}-${marker}.${extension}`;
    }
    if (part.files.normal) {
        const { path, base, extension } = splitFileName(part.files.normal);
        webAssetTaskParams.normalMapFile = `${path}p${index}-${base}-${marker}.${extension}`;
    }

    const webAssetTask = context.job.manager.createTask("WebAsset", webAssetTaskParams, context.job);
    return webAssetTask.run().then(() => modelAssetPath);
}

function splitFileName(fileName: string): { path: string, base: string, extension: string }
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