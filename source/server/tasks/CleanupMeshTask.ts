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

import Job from "../app/Job";

import { IMeshlabToolSettings } from "../tools/MeshlabTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[CleanupMeshTask]]. */
export interface ICleanupMeshTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Output mesh file name. */
    outputMeshFile: string;
    /** Meshlab only: Preserves texture coordinates during decimation. */
    preserveTexCoords?: boolean;
    /** Meshlab only: Re-computes vertex normals of the decimated mesh. */
    computeVertexNormals?: boolean;
    /** Meshlab only: Removes everything but the largest connected component. */
    keepLargestComponent?: boolean;
    /** Flag to enable optimizations for turntable captures. */
    isTurntable?: boolean;
    /** String containing scene dimensions */
    sceneSize?: number[];
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
}

/**
 * Uses a combination of Meshlab filters to clean a mesh. The following
 * filters are applied:
 * - Remove Zero Area Faces
 * - Remove Unreferenced Vertices
 * - Remove Duplicate Vertices
 * - Remove Duplicate Faces
 *
 * Parameters: [[ICleanupMeshTaskParameters]].
 * Tool: [[MeshlabTool]].
 */
export default class CleanupMeshTask extends ToolTask
{
    static readonly taskName = "CleanupMesh";

    static readonly description = "Uses a combination of Meshlab filters to clean a mesh.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            preserveTexCoords: { type: "boolean", default: true },
            computeVertexNormals: { type: "boolean", default: true },
            keepLargestComponent: { type: "boolean", default: true },
            isTurntable: { type: "boolean", default: false },
            timeout: { type: "integer", default: 0 },
            sceneSize: { type: "array" }
        },
        required: [
            "inputMeshFile",
            "outputMeshFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(CleanupMeshTask.parameterSchema);

    constructor(params: ICleanupMeshTaskParameters, context: Job)
    {
        super(params, context);

        const settings: IMeshlabToolSettings = {
            inputMeshFile: params.inputMeshFile,
            outputMeshFile: params.outputMeshFile,
            writeTexCoords: params.preserveTexCoords,
            writeNormals: params.computeVertexNormals,
            filters: [
                {
                    name: "SelectSmallComponents",
                    params: {
                        "NbFaceRatio": params.keepLargestComponent ? 0.9999 : 0.0
                    }
                },
                {
                    name: "DeleteSelected"
                },
                {
                    name: "RemoveUnreferencedVertices"
                },
                {
                    name: "RemoveZeroAreaFaces"
                },
                {
                    name: "RemoveDuplicateVertices"
                },
                {
                    name: "RemoveDuplicateFaces"
                }
            ],
            timeout: params.timeout
        };

        if(params.isTurntable) {
            settings.filters.unshift(
                /*{
                    name: "CenterScene",
                    params: {
                        "traslMethod": 'Center on Scene BBox'
                    }
                },*/
                {
                    name: "ConditionalFaceSelect",
                    params: {
                        "condSelect": 'abs(x0)&lt;'+params.sceneSize[0]*0.02+' &amp;&amp; abs(y0)&lt;'+params.sceneSize[1]*0.02 //+' &amp;&amp; abs(z0)&lt;'+params.sceneSize[2]*0.1
                    }
                },
                {
                    name: "SelectConnectedFaces"
                },
                {
                    name: "InvertSelection",
                    params: {
                        "InvFaces": true,
                        "InvVerts": false
                    }
                },
                {
                    name: "DeleteSelected"
                }
            );
        }

        this.addTool("Meshlab", settings);
    }
}