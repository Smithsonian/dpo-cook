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

import * as fs from "fs-extra";

import Job from "../app/Job";

import { IMeshlabToolSettings } from "../tools/MeshlabTool";
import { IRapidCompactToolSettings } from "../tools/RapidCompactTool";

import MeshlabTool from "../tools/MeshlabTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask, { IToolMessageEvent } from "../app/ToolTask";


////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[DecimateMeshTask]] */
export interface IDecimateMeshTaskParameters extends ITaskParameters
{
    /** Input (high poly) mesh file name. */
    inputMeshFile: string;
    /** Output (low poly) mesh file name. */
    outputMeshFile: string;
    /** Target number of faces after decimation. */
    numFaces: number;
    /** Removes unreferenced and duplicate vertices before decimation if true (default: false). */
    cleanup?: boolean;
    /** Tries not to change mesh topology if true (default: true). */
    preserveTopology?: boolean;
    /** Preserves mesh boundaries if true, i.e. doesn't remove boundary vertices (default: true). */
    preserveBoundaries?: boolean;
    /** Meshlab only: Preserves texture coordinates during decimation. */
    preserveTexCoords?: boolean;
    /** Meshlab only: Collapsed vertices placed in optimal positions. Can error and create spikes. */
    optimalPlacement?: boolean;
    /** Meshlab only: Removes components smaller than the given size. Example: "2%" */
    minComponentSize?: string | number;
    /** Meshlab only: Re-computes vertex normals of the decimated mesh. */
    computeVertexNormals?: boolean;
    /** Meshlab only: Performs mesh inspection and generates a report. If a string is given, writes report to file. */
    inspectMesh?: string | boolean;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Tool to use for decimation ("Meshlab" or "RapidCompact", default: "Meshlab"). */
    tool?: "Meshlab" | "RapidCompact";
}

/**
 * Reduces the complexity of a geometric mesh by reducing the number of vertices.
 *
 * Parameters: [[IDecimateMeshTaskParameters]]
 * Tools: [[MeshlabTool]], [[RapidCompactTool]]
 */
export default class DecimateMeshTask extends ToolTask
{
    static readonly taskName = "DecimateMesh";

    static readonly description = "Reduces the complexity of a geometric mesh by reducing the number of vertices.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            numFaces: { type: "integer", minimum: 100 },
            cleanup: { type: "boolean", default: false },
            preserveTopology: { type: "boolean", default: true },
            preserveBoundaries: { type: "boolean", default: true },
            optimalPlacement: { type: "boolean", default: true },
            minComponentSize: { oneOf: [{ type: "string" }, { type: "number"}] },
            preserveTexCoords: { type: "boolean", default: false },
            computeVertexNormals: { type: "boolean", default: false },
            inspectMesh: { oneOf:[ { type: "string" }, { type: "boolean" }]},
            timeout: { type: "integer", default: 0 },
            tool: { type: "string", enum: [ "Meshlab", "RapidCompact" ], default: "Meshlab" }
        },
        required: [
            "inputMeshFile",
            "outputMeshFile",
            "numFaces"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(DecimateMeshTask.parameterSchema);

    constructor(params: IDecimateMeshTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "Meshlab") {
            const settings: IMeshlabToolSettings = {
                inputMeshFile: params.inputMeshFile,
                outputMeshFile: params.outputMeshFile,
                writeTexCoords: params.preserveTexCoords,
                writeNormals: params.computeVertexNormals,
                timeout: params.timeout,

                filters: [{
                    name: "Simplification",
                    params: {
                        "TargetFaceNum": params.numFaces,
                        "QualityThr": 0.4,
                        "PreserveTopology": params.preserveTopology,
                        "PreserveBoundary": params.preserveBoundaries,
                        "PreserveNormal": false, // keep surface orientation
                        "OptimalPlacement": params.optimalPlacement, // re-position vertices
                        "PlanarQuadric": false, // optimize planar areas
                        "QualityWeight": false, // use triangle quality as weight factor
                        "AutoClean": true
                    }
                }]
            };

            if (params.computeVertexNormals) {
                settings.filters.push({
                    name: "ComputeVertexNormals",
                    params: {
                        "weightMode": 2 // area weighted
                    }
                });
            }

            if (params.minComponentSize) {
                let size = params.minComponentSize;
                if (typeof size === "number") {
                    size = size.toString() + "%";
                }
                console.log("MINCOMPONENTSIZE",size);
                settings.filters.unshift({
                    name: "RemoveIsolatedPieces",
                    params: {
                        "MinComponentDiag": size,
                        "removeUnref": true
                    }
                });
            }

            if (params.cleanup) {
                settings.filters.unshift(
                    { name: "RemoveUnreferencedVertices" },
                    { name: "RemoveDuplicateVertices" },
                    { name: "RemoveDuplicateFaces" },
                    { name: "RemoveZeroAreaFaces" }
                );
            }

            /*if (params.inspectMesh) {
                settings.filters.unshift({
                    name: "MeshReport"
                });
            }*/

            this.addTool("Meshlab", settings);
        }
        else if (params.tool === "RapidCompact") {
            const toolOptions: IRapidCompactToolSettings = {
                inputMeshFile: params.inputMeshFile,
                outputMeshFile: params.outputMeshFile,
                mode: "decimate",
                numFaces: params.numFaces,
                removeDuplicateVertices: params.cleanup,
                preserveTopology: params.preserveTopology,
                preserveBoundaries: params.preserveBoundaries,
                timeout: params.timeout
            };

            this.addTool("RapidCompact", toolOptions);
        }
        else {
            throw new Error("DecimateMeshTask.constructor - unknown tool: " + params.tool);
        }
    }

    /**
     * Watch instance messages for a JSON formatted inspection report.
     * @param event
     */
    protected onInstanceMessage(event: IToolMessageEvent)
    {
        const { instance, message } = event;
        const inspectMesh = (this.parameters as IDecimateMeshTaskParameters).inspectMesh;

        if (inspectMesh && instance.tool instanceof MeshlabTool && message.startsWith("JSON={")) {

            let inspectionReport = null;

            try {
                inspectionReport = JSON.parse(message.substr(5));
                this.report.result["inspection"] = inspectionReport;

                if (typeof inspectMesh === "string") {
                    const reportFilePath = instance.getFilePath(inspectMesh);
                    fs.writeFileSync(reportFilePath, JSON.stringify(inspectionReport), "utf8");
                }
            }
            catch(e) {
                this.logTaskEvent("warning", "failed to parse mesh inspection report");
            }
        }
        else {
            super.onInstanceMessage(event);
        }
    }
}