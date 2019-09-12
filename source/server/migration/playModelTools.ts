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

import * as filenamify from "filenamify";

import { Dictionary } from "@ff/core/types";

import DocumentBuilder from "../utils/DocumentBuilder";
import { IDocument, TUnitType } from "../types/document";

import { IPlayBoxInfo, IPlayContext } from "./playTypes";
import { IWebAssetTaskParameters } from "../tasks/WebAssetTask";

////////////////////////////////////////////////////////////////////////////////

const units: Dictionary<TUnitType> = {
    "millimeter": "mm",
    "centimeter": "cm",
    "meter": "m",
    "kilometer": "km",
    "inch": "in",
    "foot": "ft",
    "yard": "yd",
    "mile": "mi",
};

export async function createModels(context: IPlayContext, info: IPlayBoxInfo, document: IDocument)
{
    const parts = info.descriptor.parts;
    const builder = new DocumentBuilder(context.job.jobDir, document);
    const scene = builder.getMainScene();


    const tasks = parts.map((part, index) => {
        const node = builder.createRootNode(scene);
        node.name = part.name;

        const model = builder.getOrCreateModel(node);
        model.units = units[info.descriptor.units];

        // TODO: Model transform

        const modelAssetPath = `part-${index}-${filenamify(part.name)}.glb`;

        const taskParams: IWebAssetTaskParameters = {
            outputFile: modelAssetPath,
            meshFile: `${context.assetDir}/${part.files.mesh}`,
            objectSpaceNormals: true,
            useCompression: true,
            compressionLevel: 6,
            embedMaps: true,
            writeBinary: true
        };

        if (part.files.diffuse) {
            taskParams.diffuseMapFile = `${context.assetDir}/${part.files.diffuse}`;
        }
        if (part.files.occlusion) {
            taskParams.occlusionMapFile = `${context.assetDir}/${part.files.occlusion}`;
        }
        if (part.files.normal) {
            taskParams.normalMapFile = `${context.assetDir}/${part.files.normal}`;
        }

        const webAssetTask = context.job.manager.createTask("WebAsset", taskParams, context.job);
        return webAssetTask.run().then(() => {
            const derivative = builder.getOrCreateDerivative(model, "Medium", "Web3D");
            builder.setAsset(derivative, "Model", modelAssetPath);
        });
    });

    return Promise.all(tasks);
}