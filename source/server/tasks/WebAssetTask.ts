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

import Job from "../app/Job";

import { IMeshSmithToolOptions } from "../tools/MeshSmithTool";
import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

export interface IWebAssetTaskOptions extends ITaskParameters
{
    outputFile: string;
    meshFile: string;
    diffuseMapFile?: string;
    occlusionMapFile?: string;
    normalMapFile?: string;
    objectSpaceNormals?: boolean;
    useCompression?: boolean;
    compressionLevel?: number;
    embedMaps?: boolean;
    writeBinary?: boolean;
}

export default class WebAssetTask extends Task
{
    static readonly description = "Creates glTF/glb web assets including mesh and textures.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            outputFile: { type: "string", minLength: 1 },
            meshFile: { type: "string", minLength: 1 },
            diffuseMapFile: { type: "string", default: "" },
            occlusionMapFile: { type: "string", default: "" },
            normalMapFile: { type: "string", default: "" },
            objectSpaceNormals: { type: "boolean", default: false },
            useCompression: { type: "boolean", default: false },
            compressionLevel: { type: "integer", minimum: 0, maximum: 10, default: 10 },
            embedMaps: { type: "boolean", default: false },
            writeBinary: { type: "boolean", default: false }
        },
        required: [
            "outputFile",
            "meshFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(WebAssetTask.parameterSchema);

    constructor(options: IWebAssetTaskOptions, context: Job)
    {
        super(options, context);

        const toolOptions: IMeshSmithToolOptions = {
            inputFile: options.meshFile,
            outputFile: options.outputFile,
            format: options.writeBinary ? "glbx" : "gltfx",
            diffuseMapFile: options.diffuseMapFile,
            occlusionMapFile: options.occlusionMapFile,
            normalMapFile: options.normalMapFile,
            objectSpaceNormals: options.objectSpaceNormals,
            useCompression: options.useCompression,
            compressionLevel: options.compressionLevel,
            embedMaps: options.embedMaps
        };

        this.addTool("MeshSmith", toolOptions);
    }
}