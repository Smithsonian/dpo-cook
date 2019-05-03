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

import uniqueId from "../utils/uniqueId";

import * as path from "path";
import Tool, { IToolOptions, IToolScript, TToolMessageLevel } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IMeshSmithToolOptions extends IToolOptions
{
    inputFile: string;
    outputFile?: string;
    format?: string;
    report?: boolean;
    joinVertices?: boolean;
    stripNormals?: boolean;
    stripTexCoords?: boolean;
    swizzle?: string;
    scale?: number;
    translate?: [number, number, number];
    matrix?: number[];
    alignX?: string;
    alignY?: string;
    alignZ?: string;
    metallicFactor?: number;
    roughnessFactor?: number;
    diffuseMapFile?: string;
    occlusionMapFile?: string;
    emissiveMapFile?: string;
    metallicRoughnessMapFile?: string;
    normalMapFile?: string;
    zoneMapFile?: string;
    objectSpaceNormals?: boolean;
    embedMaps?: boolean;
    useCompression?: boolean;
    positionQuantizationBits?: number;
    texCoordsQuantizationBits?: number;
    normalsQuantizationBits?: number;
    genericQuantizationBits?: number;
    compressionLevel?: number;
}

export default class MeshSmithTool extends Tool
{
    static readonly type: string = "MeshSmithTool";

    protected static readonly defaultOptions: Partial<IMeshSmithToolOptions> = {
        metallicFactor: 0.1,
        roughnessFactor: 0.8,
        positionQuantizationBits: 14,
        texCoordsQuantizationBits: 12,
        normalsQuantizationBits: 10,
        genericQuantizationBits: 8,
        compressionLevel: 10
    };

    inspectionReport: any;

    constructor(options: IMeshSmithToolOptions, jobDir: string)
    {
        super(options, jobDir);
        this.inspectionReport = null;
    }

    run(): Promise<void>
    {
        return this.writeToolScript()
            .then(script => {
                const command = `"${this.configuration.executable}" -c "${script.filePath}"`;
                return this.waitInstance(command, script);
            });
    }

    protected onMessage(time: Date, level: TToolMessageLevel, message: string)
    {
        super.onMessage(time, level, message);

        message = message.trim();
        if (message.length < 2 || !message.startsWith("{")) {
            //super.onMessage(time, level, message);
            return;
        }

        try {
            // MeshSmith outputs json, try to parse the message
            const parsedMessage = JSON.parse(message);
            if (parsedMessage.type === "report") {
                this.inspectionReport = parsedMessage;
            }
        }
        catch (e) {
            // if parsing fails, output as standard log message
            super.onMessage(time, level, message);
        }
    }

    private writeToolScript(): Promise<IToolScript>
    {
        const options = this.options as IMeshSmithToolOptions;

        const inputFilePath = this.getFilePath(options.inputFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        }

        const outputFilePath = this.getFilePath(options.outputFile);

        const config: any = {
            input: inputFilePath,
            output: outputFilePath,
            format: options.format,
            report: options.report,
            joinVertices: options.joinVertices,
            stripNormals: options.stripNormals,
            stripTexCoords: options.stripTexCoords,

            gltfx: {
                metallicFactor: options.metallicFactor,
                roughnessFactor: options.roughnessFactor,
                useCompression: options.useCompression,
                objectSpaceNormals: options.objectSpaceNormals,
                embedMaps: options.embedMaps
            },
            "compression": {
                positionQuantizationBits: options.positionQuantizationBits,
                texCoordsQuantizationBits: options.texCoordsQuantizationBits,
                normalsQuantizationBits: options.normalsQuantizationBits,
                genericQuantizationBits: options.genericQuantizationBits,
                compressionLevel: options.compressionLevel
            }
        };

        if (options.swizzle) {
            config.swizzle = options.swizzle;
        }
        if (options.scale !== undefined && options.scale !== 1.0) {
            config.scale = options.scale;
        }
        if (options.translate) {
            config.translate = options.translate;
        }
        if (options.matrix) {
            config.matrix = options.matrix;
        }

        if (options.alignX) {
            config.alignX = options.alignX === "start" ? -1 : (options.alignX === "end" ? 1 : 0);
        }
        if (options.alignY) {
            config.alignY = options.alignY === "start" ? -1 : (options.alignY === "end" ? 1 : 0);
        }
        if (options.alignZ) {
            config.alignZ = options.alignZ === "start" ? -1 : (options.alignZ === "end" ? 1 : 0);
        }

        if (options.diffuseMapFile) {
            config.gltfx.diffuseMap = this.getFilePath(options.diffuseMapFile);
        }
        if (options.occlusionMapFile) {
            config.gltfx.occlusionMap = this.getFilePath(options.occlusionMapFile);
        }
        if (options.emissiveMapFile) {
            config.gltfx.emissiveMap = this.getFilePath(options.emissiveMapFile);
        }
        if (options.metallicRoughnessMapFile) {
            config.gltfx.metallicRoughnessMap = this.getFilePath(options.metallicRoughnessMapFile);
        }
        if (options.normalMapFile) {
            config.gltfx.normalMap = this.getFilePath(options.normalMapFile);
        }
        if (options.zoneMapFile) {
            config.gltfx.zoneMap = this.getFilePath(options.zoneMapFile);
        }

        if (!options.format && outputFilePath) {
            const extension = path.extname(outputFilePath);
            switch(extension) {
                case ".dae":
                    config.format = "collada"; break;
                case ".ply":
                    config.format = "plyb"; break;
                case ".stl":
                    config.format = "stlb"; break;
                case ".3ds":
                    config.format = "3ds"; break;
                case ".gltf":
                    config.format = "gltfx"; break;
                case ".glb":
                    config.format = "glbx"; break;
                case ".obj":
                    config.format = "objnomtl"; break;
            }
        }

        const scriptFileName = "_meshsmith_" + uniqueId() + ".json";
        const scriptFilePath = this.getFilePath(scriptFileName);

        return this.writeFile(scriptFilePath, JSON.stringify(config, null, 2));
    }
}