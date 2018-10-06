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

import { IUnfoldToolOptions } from "../tools/UnfoldTool";
import { IUnknitToolOptions } from "../tools/UnknitTool";
import { IMopsToolOptions } from "../tools/MopsTool";

import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

const limit = (n, min, max) => n < min ? min : (n > max ? max: n);

export type TUnwrapMethod =
    "conformal" | "fastConformal" | "isometric" | "forwardBijective" | "fixedBoundary";
export type TUnwrapTool =
    "Unfold" | "Unknit" | "Mops";


export interface IUnwrapMeshTaskParameters extends ITaskParameters
{
    inputMeshFile: string;
    outputMeshFile: string;
    saveObj?: boolean; // unfold only
    saveFbx?: boolean; // unfold only
    saveCollada?: boolean; // unfold only
    decimate?: boolean; // only possible with mops
    numFaces?: number;
    mapSize: number;
    segmentationStrength?: number,
    packEffort?: number,
    cutHandles?: boolean,
    unwrapMethod?: TUnwrapMethod,
    debug?: boolean,
    timeout?: number,
    tool?: TUnwrapTool;
}

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
                enum: [ "Unfold", "Unknit", "Mops" ],
                default: "Unfold"
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
            case "Unfold":
                const cutSegmentationStrength = limit(segmentationStrength, 0, 1);

                const index = limit(Math.trunc(packEffort * 5), 0, 4);
                const mutations = [ 1, 2, 2, 3, 3 ];
                const steps = [ 90, 45, 30, 30, 15 ];

                const packResolution = limit(100 + packEffort * 800, 100, 900);
                const packMutations = mutations[index];
                const packRotateStep = steps[index];

                const unfoldOptions: IUnfoldToolOptions = {
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

                this.addTool("Unfold", unfoldOptions);
                break;

            case "Mops":
                const chartAngleDeg = limit(60 + segmentationStrength * 120, 60, 180);

                const mopsOptions: IMopsToolOptions = {
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
                    mopsOptions.numFaces = params.numFaces;
                }

                this.addTool("Mops", mopsOptions);
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