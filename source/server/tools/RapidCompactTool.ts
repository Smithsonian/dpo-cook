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

import * as fs from "fs";
import * as path from "path";

import uniqueId from "../utils/uniqueId";

import Tool, { IToolOptions, TToolState } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export type TRapidCompactMode =
    "decimate" | "unwrap" | "decimate-unwrap" | "bake";
export type TRapidCompactUnwrapMethod =
    "conformal" | "fastConformal" | "isometric" | "forwardBijective" | "fixedBoundary";

export interface IRapidCompactToolOptions extends IToolOptions
{
    highPolyMeshFile?: string;
    lowPolyMeshFile?: string;
    inputMeshFile?: string;
    outputMeshFile?: string;
    mode: TRapidCompactMode;
    numFaces?: number;
    unwrapMethod?: TRapidCompactUnwrapMethod;
    cutAngleDeg?: number;
    chartAngleDeg?: number;
    chartPadding?: number;
    mapBaseName?: string;
    mapSize?: number;
    bakeOcclusion?: boolean;
    occlusionRays?: number;
    tangentSpaceNormals?: boolean;
    preserveBoundary?: boolean;
    collapseUnconnectedVertices?: boolean;
    removeDuplicateVertices?: boolean;
}

export default class RapidCompactTool extends Tool
{
    static readonly type: string = "RapidCompactTool";

    protected static readonly defaultOptions: Partial<IRapidCompactToolOptions> = {
        mode: "unwrap",
        unwrapMethod: "forwardBijective",
        cutAngleDeg: 95, // 95
        chartAngleDeg: 120, // 65
        chartPadding: 4/1024,
        bakeOcclusion: false,
        occlusionRays: 128,
        tangentSpaceNormals: false,
        preserveBoundary: true,
        collapseUnconnectedVertices: true,
        removeDuplicateVertices: false
    };

    run(): Promise<void>
    {
        const options = this.options as IRapidCompactToolOptions;
        const { optionString, configFilePath } = this.configureOptions();

        let command = `"${this.configuration.executable}" --read_config "${configFilePath}"`;

        if (options.mode === "bake") {
            const highPolyMesh = this.getFilePath(options.highPolyMeshFile);
            const lowPolyMesh = this.getFilePath(options.lowPolyMeshFile);

            command += ` -i "${highPolyMesh}" -i "${lowPolyMesh}" ${optionString} -e _rpd_dummy.obj`;
        }
        else {
            const inputFilePath = this.getFilePath(options.inputMeshFile);
            const outputFilePath = this.getFilePath(options.outputMeshFile);

            command += ` -i "${inputFilePath}" ${optionString} -e "${outputFilePath}"`;
        }

        return this.waitInstance(command);
    }

    protected onExit(time: Date, error: Error, code: number, endState: TToolState)
    {
        if (error) {
            return;
        }

        const options = this.options as IRapidCompactToolOptions;

        if (options.mode === "bake") {
            this.removeFile("_rpd_dummy.obj");
            this.removeFile("_rpd_dummy.mtl");

            const mapBaseName = options.mapBaseName;
            const ext = path.extname(mapBaseName);
            const base = path.basename(mapBaseName, ext);
            const dir = path.dirname(mapBaseName);
            const basePath = path.resolve(dir, base);

            this.renameFile("material0_normal.png", `${basePath}-normals${ext}`);
            this.renameFile("material0_occlusion.png", `${basePath}-occlusion${ext}`);
            this.renameFile("material0_basecolor.png", `${basePath}-diffuse${ext}`);
        }
    }

    private configureOptions(): { optionString: string, configFilePath: string }
    {
        const options = this.options as IRapidCompactToolOptions;
        let opts = [];

        const config = Object.assign({}, RapidCompactTool.defaultConfig);

        if (options.mode === "decimate" || options.mode === "decimate-unwrap") {

            if (options.removeDuplicateVertices) {
                opts.push("--remove_duplicate_vertices");
            }
            opts.push("--decimate f:" + options.numFaces);

            config["decimation:boundaryPreservationFactor"] = options.preserveBoundary ? 1.0 : 0.5;
            config["decimation:collapseUnconnectedVertices"] = options.collapseUnconnectedVertices;
        }
        if (options.mode === "unwrap" || options.mode === "decimate-unwrap") {

            opts.push("--segment --unwrap");

            // threshold for cutting sharp edges
            config["segmentation:cutAngleDeg"] = options.cutAngleDeg;
            // number of charts vs stretch: lower = more charts, less stretch
            config["segmentation:chartAngleDeg"] = options.chartAngleDeg;
            // limit for the number of primitives per chart
            config["segmentation:maxPrimitivesPerChart"] = 10000;
            // unwrapping algorithm
            config["unwrapping:method"] = options.unwrapMethod;
            // padding around each chart, relative value
            config["packing:chartPadding"] = options.chartPadding;
            // minimum size of each chart, relative value
            config["packing:minValidChartSize"] = 2 / 1024;
        }
        if (options.mode === "bake") {

            opts.push("--bake_maps");
            config["baking:baseColorMapResolution"] = options.mapSize;
            config["baking:normalMapResolution"] = options.mapSize;

            config["ao:enabled"] = options.bakeOcclusion;
            config["ao:replaceMissingAlbedo"] = false;
            config["baking:occlusionMapResolution"] = options.mapSize;
            config["inpainting:radius"] = options.mapSize / 512; // 1k = 2, 2k = 4, 4k = 8;
            config["baking:tangentSpaceNormals"] = options.tangentSpaceNormals;

            const extension = path.extname(options.mapBaseName).substr(1);
            config["export:baseColorMapFormat"] = extension;
            config["export:normalMapFormat"] = extension;
            config["export:occlusionMapFormat"] = extension;

        }


        // write RapidCompact config file
        const configFileName = "_rapidcompact_" + uniqueId() + ".json";
        const configFilePath = this.getFilePath(configFileName);

        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));

        return {
            optionString: opts.join(" "),
            configFilePath
        };
    }

    static defaultConfig = {
        "ao:enabled": false,
        "ao:filterRadius": 5,
        "ao:replaceMissingAlbedo": true,
        "ao:textureSamples": 8,
        "ao:vertexSamples": 100,
        "baking:baseColorMapResolution": 2048,
        "baking:displacementMapResolution": 2048,
        "baking:forcedDisplacementMax": 0,
        "baking:forcedDisplacementMin": 0,
        "baking:generateDisplacement": false,
        "baking:normalMapResolution": 2048,
        "baking:occlusionMapResolution": 2048,
        "baking:tangentSpaceNormals": true,
        "decimation:boundaryPreservationFactor": 0.5,
        "decimation:collapseDistanceThreshold": 0.050000000000000003,
        "decimation:collapseUnconnectedVertices": true,
        "decimation:defaultTargetParameter": "v:10000",
        "decimation:method": "quadric",
        "export:baseColorMapFormat": "jpg",
        "export:displacementMapFormat": "jpg",
        "export:displacementToNormalMapAlpha": false,
        "export:normalMapFormat": "jpg",
        "export:occlusionMapFormat": "jpg",
        "export:preferBinaryFormat": true,
        "import:rotateZUp": false,
        "inpainting:enabled": true,
        "inpainting:radius": 32,
        "logging:infoLevel": 3,
        "material:defaultBaseColor": "1 1 1",
        "material:defaultMetallic": 0,
        "material:defaultRoughness": 0.85999999999999999,
        "packing:chartPadding": 0.00048828125,
        "packing:minValidChartSize": 0.001953125,
        "rendering:background": "transparent",
        "rendering:imageHeight": 1024,
        "rendering:imageWidth": 1024,
        "rendering:showBackFaces": false,
        "segmentation:chartAngleDeg": 160,
        "segmentation:cutAngleDeg": 85,
        "segmentation:maxPrimitivesPerChart": 10000,
        "unwrapping:cutOverlappingPieces": true,
        "unwrapping:method": "fastConformal"
    }
}