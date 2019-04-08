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

/** Parameters for [[WebAssetTask]]. */
export interface IWebAssetTaskParameters extends ITaskParameters
{
    /** File name of the resulting web asset. */
    outputFile: string;
    /** File name of the input mesh to be added to the web asset. */
    meshFile: string;
    /** File name of the diffuse map to be added to the web asset. */
    diffuseMapFile?: string;
    /** File name of the occlusion map to be added to the web asset. */
    occlusionMapFile?: string;
    /** File name of the normal map to be added to the web asset. */
    normalMapFile?: string;
    /** Centers object if true, i.e. aligns object with origin. */
    alignCenter?: boolean;
    /** Centers object and aligns it with y-origin if true. */
    alignFloor?: boolean;
    /** True to use object space normals, false for tangent space normals. */
    objectSpaceNormals?: boolean;
    /** True if geometry should be compressed using the DRACO mesh compressor. */
    useCompression?: boolean;
    /** Compression level for DRACO mesh compression, range 0 - 10, default: 10. */
    compressionLevel?: number;
    /** True if map data should be embedded in the asset file, false if maps are embedded by reference only. */
    embedMaps?: boolean;
    /** True if the asset should be written in binary format (.glb), false for a text .gltf file. */
    writeBinary?: boolean;
}

/**
 * Combines mesh and map data into a GLTF web asset. The asset can be written in JSON or binary format,
 * with optionally embedded maps and DRACO-compressed mesh data.
 *
 * Parameters: [[IWebAssetTaskParameters]].
 * Tool: [[MeshSmithTool]].
 */
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
            alignCenter: { type: "boolean", default: false },
            alignFloor: { type: "boolean", default: false },
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

    constructor(options: IWebAssetTaskParameters, context: Job)
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

        if (options.alignCenter) {
            toolOptions.alignX = "center";
            toolOptions.alignY = "center";
            toolOptions.alignZ = "center";
        }
        if (options.alignFloor) {
            toolOptions.alignX = "center";
            toolOptions.alignY = "start";
            toolOptions.alignZ = "center";
        }

        this.addTool("MeshSmith", toolOptions);
    }
}