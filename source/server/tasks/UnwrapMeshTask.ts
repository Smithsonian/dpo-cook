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

import { IRizomUVToolOptions } from "../tools/RizomUVTool";
import { IUnknitToolOptions } from "../tools/UnknitTool";
import { IRapidCompactToolOptions } from "../tools/RapidCompactTool";

import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

const limit = (n, min, max) => n < min ? min : (n > max ? max: n);

export type TUnwrapMethod =
    "conformal" | "fastConformal" | "isometric" | "forwardBijective" | "fixedBoundary";
export type TUnwrapTool =
    "RizomUV" | "Unknit" | "RapidCompact";

/** Parameters for [[UnwrapMeshTask]] */
export interface IUnwrapMeshTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Output mesh file name. */
    outputMeshFile: string;
    /** RizomUV only: saves the mesh as (additional) OBJ file. */
    saveObj?: boolean;
    /** RizomUV only: saves the mesh as (additional) FBX file. */
    saveFbx?: boolean;
    /** RizomUV only: saves the mesh as (additional) Collada file. */
    saveCollada?: boolean;
    /** RapidCompact only: indicates whether the mesh should be decimated before unwrapping. */
    decimate?: boolean;
    /** RapidCompact only: if decimation is enabled, the target number of faces. */
    numFaces?: number;
    /** The size of the texture maps that will be baked (needed to calculate the gap between patches). */
    mapSize: number;
    /** A number between 0 and 1 specifying how aggressively the mesh surface is segmented. Default is 0.5. */
    segmentationStrength?: number,
    /** A number between 0 and 1 specifying how tightly the patches should be packed. Default is 0.5. */
    packEffort?: number,
    /** RizomUV only: decides whether handles can be cut during segmentation. */
    cutHandles?: boolean,
    /** RapidCompact only: the algorithm to be used for unwrapping: "conformal", "fastConformal", "isometric", "forwardBijective", "fixedBoundary". */
    unwrapMethod?: TUnwrapMethod,
    /** Unwrapping tool is run in debug mode. For RizomUV: tool doesn't close after it's done. */
    debug?: boolean,
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number,
    /** Tool to be used for unwrapping, options are "RizomUV", "RapidCompact", "Unknit". Default is "RizomUV". */
    tool?: TUnwrapTool;
}

/**
 * Unwraps a mesh's surface onto a plane and generates a set of texture coordinates for map baking.
 *
 * - Parameters: [[IUnwrapMeshTaskParameters]].
 * - Tools: [[RizomUVTool]], [[RapidCompactTool]], [[UnknitTool]].
 */
export default class UnwrapMeshTask extends Task
{
    static readonly description = "creates a new UV map for a mesh.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            saveObj: { type: "boolean", default: false },
            saveFbx: { type: "boolean", default: false },
            saveCollada: { type: "boolean", default: false },
            decimate: { type: "boolean", default: false },
            numFaces: { type: "integer", minimum: 100 },
            mapSize: { type: "integer", multipleOf: 128, default: 2048 },
            segmentationStrength: { type: "number", minimum: 0, maximum: 1, default: 0.5 },
            packEffort: { type: "number", minimum: 0, maximum: 1, default: 0.5 },
            cutHandles: { type: "boolean", default: true },
            unwrapMethod: {
                type: "string",
                enum: [ "conformal", "fastConformal", "isometric", "forwardBijective", "fixedBoundary" ],
                default: "forwardBijective"
            },
            debug: { type: "boolean", default: false },
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: {
                type: "string",
                enum: [ "RizomUV", "Unknit", "RapidCompact" ],
                default: "RizomUV"
            }
        },
        required: [
            "inputMeshFile",
            "outputMeshFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(UnwrapMeshTask.parameterSchema);

    constructor(params: IUnwrapMeshTaskParameters, context: Job)
    {
        super(params, context);

        const segmentationStrength = parseFloat(params.segmentationStrength.toString());
        const packEffort = parseFloat(params.packEffort.toString());

        switch(params.tool) {
            case "RizomUV":
                const cutSegmentationStrength = limit(segmentationStrength, 0, 1);

                const index = limit(Math.trunc(packEffort * 5), 0, 4);
                const mutations = [ 1, 2, 2, 3, 3 ];
                const steps = [ 90, 45, 30, 30, 15 ];

                const packResolution = limit(100 + packEffort * 800, 100, 900);
                const packMutations = mutations[index];
                const packRotateStep = steps[index];

                const rizomUVOptions: IRizomUVToolOptions = {
                    inputMeshFile: params.inputMeshFile,
                    outputMeshFile: params.outputMeshFile,
                    saveObj: params.saveObj,
                    saveFbx: params.saveFbx,
                    saveCollada: params.saveCollada,
                    cutSegmentationStrength,
                    cutHandles: params.cutHandles,
                    packResolution,
                    packMutations,
                    packRotateStep,
                    timeout: params.timeout
                };

                this.addTool("RizomUV", rizomUVOptions);
                break;

            case "RapidCompact":
                const chartAngleDeg = limit(60 + segmentationStrength * 120, 60, 180);

                const rpdOptions: IRapidCompactToolOptions = {
                    inputMeshFile: params.inputMeshFile,
                    outputMeshFile: params.outputMeshFile,
                    mode: params.decimate ? "decimate-unwrap" : "unwrap",
                    unwrapMethod: params.unwrapMethod,
                    cutAngleDeg: 95,
                    chartAngleDeg,
                    mapSize: params.mapSize,
                    timeout: params.timeout
                };

                if (params.decimate) {
                    if (!params.numFaces) {
                        throw new Error("for decimation, target number of faces (numFaces) must be specified");
                    }
                    rpdOptions.numFaces = params.numFaces;
                }

                this.addTool("RapidCompact", rpdOptions);
                break;

            case "Unknit":
                const unknitOptions: IUnknitToolOptions = {
                    inputMeshFile: params.inputMeshFile,
                    outputMeshFile: params.outputMeshFile,
                    mapSize: params.mapSize,
                    showUI: params.debug
                };

                this.addTool("Unknit", unknitOptions);
                break;

            default:
                throw new Error("unknown tool: " + params.tool);
        }
    }
}