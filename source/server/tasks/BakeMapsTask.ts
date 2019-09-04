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

import Job from "../app/Job";

import { IXNormalToolSettings } from "../tools/XNormalTool";
import { IRapidCompactToolSettings } from "../tools/RapidCompactTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[BakeMapTask]]. */
export interface IBakeMapsTaskParameters extends ITaskParameters
{
    /** High resolution mesh file name. */
    highPolyMeshFile: string;
    /** Diffuse texture for high resolution mesh. */
    highPolyDiffuseMapFile?: string;
    /** Low resolution (decimated) mesh file name. */
    lowPolyUnwrappedMeshFile: string;
    /** Base name for baked texture map files. */
    mapBaseName: string;
    /** Baked map size in pixels (default: 2048). */
    mapSize: number;
    /** Maximum search distance when projecting details onto low poly mesh (default: 0.001). */
    maxRayDistance?: number;
    /** Bakes a diffuse map if true and highPolyDiffuseMapFile is not empty (default: true). */
    bakeDiffuse?: boolean;
    /** Bakes an ambient occlusion map if true (default: true). */
    bakeOcclusion?: boolean;
    /** Bakes a normal map if true (default: true). */
    bakeNormals?: boolean;
    /** Bakes a test map for checking the projection quality if true (default: false). */
    bakeTest?: boolean;
    /** Number of sample rays for ambient occlusion (default: 128). */
    occlusionRays?: number;
    /** Maximum cone angle for ambient occlusion sample rays (default: 165). */
    occlusionConeAngle?: number;
    /** Ambient occlusion attenuation, constant factor (default: 1). */
    occlusionAttConstant?: number;
    /** Ambient occlusion attenuation, linear factor (default: 0). */
    occlusionAttLinear?: number;
    /** Ambient occlusion attenuation, quadratic factor (default: 0). */
    occlusionAttQuadratic?: number;
    /** Bakes normals in tangent space if true (default: false). */
    tangentSpaceNormals?: boolean;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Baking tool to use: [[XNormalTool]] or [[RapidCompactTool]]. */
    tool?: "XNormal" | "RapidCompact";
}

/**
 * Bakes various features to texture by projecting them from a high poly mesh
 * onto the UV space of a low poly mesh.
 *
 * Parameters: [[IBakeMapsTaskParameters]].
 * Tool: [[XNormalTool]].
 */
export default class BakeMapsTask extends ToolTask
{
    static readonly description = "Bakes various features to texture by projecting them " +
                                  "from a high poly mesh onto the UV space of a low poly mesh.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            highPolyMeshFile: { type: "string", minLength: 1 },
            highPolyDiffuseMapFile: { type: "string" },
            lowPolyUnwrappedMeshFile: { type: "string", minLength: 1 },
            mapBaseName: { type: "string", minLength: 1 },
            mapSize: { type: "integer", multipleOf: 128 },
            maxRayDistance: { type: "number", default: 0.001 },
            bakeDiffuse: { type: "boolean", default: true },
            bakeOcclusion: { type: "boolean", default: true },
            bakeNormals: { type: "boolean", default: true },
            bakeTest: { type: "boolean", default: false },
            occlusionRays: { type: "integer", minimum: 1, maximum: 512, default: 128 },
            occlusionConeAngle: { type: "integer", minimum: 1, maximum: 180, default: 165 },
            occlusionAttConstant: { type: "number", minimum: 0, maximum: 1, default: 1 },
            occlusionAttLinear: { type: "number", minimum: 0, maximum: 1, default: 0 },
            occlusionAttQuadratic: { type: "number", minimum: 0, maximum: 1, default: 0 },
            tangentSpaceNormals: { type: "boolean", default: false },
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: { type: "string", enum: [ "XNormal", "RapidCompact" ], default: "XNormal" }
        },
        required: [
            "highPolyMeshFile",
            "lowPolyUnwrappedMeshFile",
            "mapBaseName",
            "mapSize"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(BakeMapsTask.parameterSchema);

    constructor(params: IBakeMapsTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "RapidCompact") {
            this.setupRapidCompact(params);
        }
        else {
            this.setupXNormal(params);
        }
    }

    private setupXNormal(parameters: IBakeMapsTaskParameters)
    {
        const settings: IXNormalToolSettings = {
            highPolyMeshFile: parameters.highPolyMeshFile,
            lowPolyUnwrappedMeshFile: parameters.lowPolyUnwrappedMeshFile,
            mapBaseName: parameters.mapBaseName,
            mapSize: parameters.mapSize,
            maxRayDistance: parameters.maxRayDistance,
            bakeDiffuse: !!parameters.highPolyDiffuseMapFile && parameters.bakeDiffuse,
            bakeOcclusion: parameters.bakeOcclusion,
            bakeNormals: parameters.bakeNormals,
            bakeTest: parameters.bakeTest,
            occlusionRays: parameters.occlusionRays,
            occlusionConeAngle: parameters.occlusionConeAngle,
            occlusionAttConstant: parameters.occlusionAttConstant,
            occlusionAttLinear: parameters.occlusionAttLinear,
            occlusionAttQuadratic: parameters.occlusionAttQuadratic,
            tangentSpaceNormals: parameters.tangentSpaceNormals,
            timeout: parameters.timeout
        };

        if (settings.bakeDiffuse) {
            settings.highPolyDiffuseMapFile = parameters.highPolyDiffuseMapFile;
        }

        this.addTool("XNormal", settings);
    }

    private setupRapidCompact(parameters: IBakeMapsTaskParameters)
    {
        const mapBaseName = parameters.mapBaseName;

        const settings: IRapidCompactToolSettings = {
            mode: "bake",
            mapBaseName,
            mapSize: parameters.mapSize,
            bakeOcclusion: parameters.bakeOcclusion,
            tangentSpaceNormals: parameters.tangentSpaceNormals,
            timeout: parameters.timeout
        };

        this.addTool("RapidCompact", settings);
    }
}