/**
 * 3D Foundation Project
 * Copyright 2023 Smithsonian Institution
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

import uniqueId from "../utils/uniqueId";

import Tool, { IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export type TRapidCompactMode =
    "decimate" | "unwrap" | "decimate-unwrap" | "bake" | "convert" | "tex-compress";
export type TRapidCompactUnwrapMethod =
    "conformal" | "fastConformal" | "isometric" | "forwardBijective" | "fixedBoundary";

export interface IRapidCompactToolSettings extends IToolSettings
{
    /** Name of the high resolution input mesh file (bake mode only). */
    highPolyMeshFile?: string;
    /** Name of the low resolution input mesh file (bake mode only). */
    lowPolyMeshFile?: string;
    /** Name of the input mesh file (decimate and unwrap modes). */
    inputMeshFile?: string;
    /** Name of the output mesh file (decimate, tex-compress, and unwrap modes). */
    outputMeshFile?: string;
    /** Defines the task to be executed by RapidCompact. */
    mode: TRapidCompactMode;
    /** The target number of faces. */
    numFaces?: number;
    /** The algorithm to be used for UV unwrapping. */
    unwrapMethod?: TRapidCompactUnwrapMethod;
    /** The cut angle degree used for UV unwrapping. Default is 95. */
    cutAngleDeg?: number;
    /** The chart angle degree used for UV unwrapping. Default is 120. */
    chartAngleDeg?: number;
    /** The chart padding (relative value between 0 and 1, default is 4/1024. */
    chartPadding?: number;
    /** The base name for the generated texture maps. */
    mapBaseName?: string;
    /** The size of the baked texture maps. */
    mapSize?: number;
    /** Set to true to bake an occlusion map. */
    bakeOcclusion?: boolean;
    /** Number of rays to use for ambient occlusion. Default is 128. */
    occlusionRays?: number;
    /** Normal space to use. Tangent space is used if set to true, object space otherwise. Default is false. */
    tangentSpaceNormals?: boolean;
    /** Should the topology be preserved during decimation? Default is true. */
    preserveTopology?: boolean;
    /** Should boundaries be preserved during decimation? Default is true. */
    preserveBoundaries?: boolean;
    /** Can unconnected vertices be collapsed during decimation? Default is true. */
    collapseUnconnectedVertices?: boolean;
    /** Should duplicate vertices be removed during decimation? Default is false. */
    removeDuplicateVertices?: boolean;
    /** Uniform scale to apply to a mesh. Default is 1*/
    scale?: number;
    /** Texture compression format (etc1s | uastc, tex-compress mode only). */
    texCompressionFormat?: string;
}

export type RapidCompactInstance = ToolInstance<RapidCompactTool, IRapidCompactToolSettings>;

export default class RapidCompactTool extends Tool<RapidCompactTool, IRapidCompactToolSettings>
{
    static readonly toolName = "RapidCompact";

    protected static readonly defaultOptions: Partial<IRapidCompactToolSettings> = {
        mode: "unwrap",
        unwrapMethod: "forwardBijective",
        cutAngleDeg: 95, // 95
        chartAngleDeg: 120, // 65
        chartPadding: 4/1024,
        bakeOcclusion: false,
        occlusionRays: 128,
        tangentSpaceNormals: false,
        preserveTopology: true,
        preserveBoundaries: true,
        collapseUnconnectedVertices: true,
        removeDuplicateVertices: false,
        scale: 1,
        texCompressionFormat: "etc1s"
    };

    async setupInstance(instance: RapidCompactInstance): Promise<IToolSetup>
    {
        return this.configureOptions(instance).then(config => {

            const settings = instance.settings;
            const scriptFilePath = instance.getFilePath(config.fileName);
            let command = `"${this.configuration.executable}" --read_config "${scriptFilePath}"`;

            if (settings.mode === "bake") {
                const highPolyMesh = instance.getFilePath(settings.highPolyMeshFile);
                const lowPolyMesh = instance.getFilePath(settings.lowPolyMeshFile);

                command += ` -i "${highPolyMesh}" -i "${lowPolyMesh}" ${config.options} -e _rpd_dummy.obj`;
            }
            else if (settings.mode === "tex-compress") {
                const inputFilePath = instance.getFilePath(settings.inputMeshFile);

                command += ` -i "${inputFilePath}" ${config.options} -e "${inputFilePath}"`;
            }
            else {
                const inputFilePath = instance.getFilePath(settings.inputMeshFile);
                const outputFilePath = instance.getFilePath(settings.outputMeshFile);

                command += ` -i "${inputFilePath}" ${config.options} -e "${outputFilePath}"`;
            }

            return {
                command,
                script: { fileName: config.fileName, content: config.content }
            };
        });
    }

    instanceDidExit(instance: RapidCompactInstance): Promise<unknown>
    {
        if (instance.state !== "done") {
            return Promise.resolve();
        }

        const settings = instance.settings;

        if (settings.mode === "bake") {
            const mapBaseName = settings.mapBaseName;
            const ext = path.extname(mapBaseName);
            const base = path.basename(mapBaseName, ext);
            const dir = path.dirname(mapBaseName);
            const basePath = path.resolve(dir, base);

            const fileTasks = [
                instance.removeFile("_rpd_dummy.obj"),
                instance.removeFile("_rpd_dummy.mtl"),
                instance.renameFile("material0_normal.png", `${basePath}-normals${ext}`),
                instance.renameFile("material0_occlusion.png", `${basePath}-occlusion${ext}`),
                instance.renameFile("material0_basecolor.png", `${basePath}-diffuse${ext}`),
            ];

            return Promise.all(fileTasks);
        }
    }

    private configureOptions(instance: RapidCompactInstance)
    {
        const settings = instance.settings;
        let options = [];

        // initialize configuration with a copy of the default configuration
        const config = Object.assign({}, RapidCompactTool.defaultConfig);

        if (settings.mode === "decimate" || settings.mode === "decimate-unwrap") {

            if (settings.removeDuplicateVertices) {
                options.push("--remove_duplicate_vertices");
            }
            options.push("--decimate f:" + settings.numFaces);

            config["decimation:preserveTopology"] = settings.preserveTopology;
            config["decimation:boundaryPreservationFactor"] = settings.preserveBoundaries ? 1.0 : 0.5;
            config["decimation:collapseUnconnectedVertices"] = settings.collapseUnconnectedVertices;
        }
        if (settings.mode === "unwrap" || settings.mode === "decimate-unwrap") {

            options.push("--segment --unwrap");

            // threshold for cutting sharp edges
            config["segmentation:cutAngleDeg"] = settings.cutAngleDeg;
            // number of charts vs stretch: lower = more charts, less stretch
            config["segmentation:chartAngleDeg"] = settings.chartAngleDeg;
            // limit for the number of primitives per chart
            config["segmentation:maxPrimitivesPerChart"] = 10000;
            // unwrapping algorithm
            config["unwrapping:method"] = settings.unwrapMethod;
            // padding around each chart, relative value
            config["packing:chartPadding"] = settings.chartPadding;
            // minimum size of each chart, relative value
            config["packing:minValidChartSize"] = 2 / 1024;
        }
        if (settings.mode === "bake") {

            options.push("--bake_maps");
            config["baking:baseColorMapResolution"] = settings.mapSize;
            config["baking:normalMapResolution"] = settings.mapSize;

            config["ao:enabled"] = settings.bakeOcclusion;
            config["ao:replaceMissingAlbedo"] = false;
            config["baking:occlusionMapResolution"] = settings.mapSize;
            config["inpainting:radius"] = settings.mapSize / 512; // 1k = 2, 2k = 4, 4k = 8;
            config["baking:tangentSpaceNormals"] = settings.tangentSpaceNormals;

            const extension = path.extname(settings.mapBaseName).substr(1);
            config["export:baseColorMapFormat"] = extension;
            config["export:normalMapFormat"] = extension;
            config["export:occlusionMapFormat"] = extension;

        }
        if (settings.mode === "convert") {
            options.push("--scale " + settings.scale);
        }
        if (settings.mode === "tex-compress") {
            config["export:baseColorMapFormat"] = settings.texCompressionFormat === "uastc" ? "ktx-basis-uastc" : "ktx-basis-etc1s";
            config["export:geometryCompression"] = "draco";
        }

        // write RapidCompact config file
        const fileName = "_rapidcompact_" + uniqueId() + ".json";
        const content = JSON.stringify(config, null, 2);

        return instance.writeFile(fileName, content).then(() => ({ fileName, content, options }));
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
        "baking:generateNormal": true,
        "baking:normalMapResolution": 2048,
        "baking:occlusionMapResolution": 2048,
        "baking:sampleCount": 1,
        "baking:tangentSpaceNormals": true,
        "decimation:boundaryPreservationFactor": 0.5,
        "decimation:collapseDistanceThreshold": 0.05,
        "decimation:collapseUnconnectedVertices": true,
        "decimation:defaultTarget": "f:20000",
        "decimation:method": "quadric",
        "decimation:preserveTopology": false,
        "decimation:qualityWeight": 0,
        "decimation:recomputeNormals": true,
        "export:baseColorMapFormat": "jpg",
        "export:centerModel": false,
        "export:displacementMapFormat": "jpg",
        "export:displacementToNormalMapAlpha": false,
        "export:emissiveMapFormat": "jpg",
        "export:metallicMapFormat": "jpg",
        "export:normalMapFormat": "jpg",
        "export:occlusionMapFormat": "jpg",
        "export:preferBinaryFormat": true,
        "export:roughnessMapFormat": "jpg",
        "export:textureMapFilePrefix": "",
        "export:unlitMaterials": false,
        "general:maxConcurrentThreads": 0,
        "general:normalsHardAngleDeg": 180,
        "import:rotateZUp": false,
        "inpainting:radius": 32,
        "logging:infoLevel": 3,
        "material:defaultBaseColor": "1 1 1",
        "material:defaultMetallic": 0.2,
        "material:defaultRoughness": 0.4,
        "packing:chartPadding": 0.00048828125,
        "rendering:background": "transparent",
        "rendering:imageHeight": 1024,
        "rendering:imageWidth": 1024,
        "rendering:showBackFaces": false,
        "segmentation:chartAngleDeg": 130,
        "segmentation:cutAngleDeg": 88,
        "segmentation:maxPrimitivesPerChart": 10000,
        "unwrapping:cutOverlappingPieces": true,
        "unwrapping:method": "isometric"
    };
}