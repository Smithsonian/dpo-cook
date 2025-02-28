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

import Job from "../app/Job";

import { IMeshSmithToolSettings } from "../tools/MeshSmithTool";
import { IMeshlabToolSettings } from "../tools/MeshlabTool";
import { IFBX2glTFToolSettings, TFBX2glTFComputeNormals } from "../tools/FBX2glTFTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";
import { IBlenderToolSettings } from "../tools/BlenderTool";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[ConvertMeshTask]]. */
export interface IConvertMeshTaskParameters extends ITaskParameters
{
    /** Input mesh file name. */
    inputMeshFile: string;
    /** Converted (output) mesh file name. */
    outputMeshFile: string;
    /** Removes normals if true. */
    stripNormals?: boolean;
    /** Removes UVs (texture coordinates) if true. */
    stripTexCoords?: boolean;
    /** Joins identical vertices if true. Using this option can reduce file size significantly. */
    joinVertices?: boolean;
    /** Use DRACO mesh compression. */
    useCompression?: boolean;
    /** FBX2glTF only: recompute normals. For valid options see [[TFBX2glTFComputeNormals]]. */
    computeNormals?: TFBX2glTFComputeNormals;
    /** MeshSmith only: Custom swizzle operation if set. Example: "X+Z+Y-". */
    swizzle?: string;
    /** MeshSmith only: aligns the mesh along the x-axis, options are "start", "end", "center". */
    alignX?: string;
    /** MeshSmith only: aligns the mesh along the y-axis, options are "start", "end", "center". */
    alignY?: string;
    /** MeshSmith only: aligns the mesh along the z-axis, options are "start", "end", "center". */
    alignZ?: string;
    /** MeshSmith only: translates the mesh on the x-axis. */
    translateX?: number;
    /** MeshSmith only: translates the mesh on the y-axis. */
    translateY?: number;
    /** MeshSmith only: translates the mesh on the z-axis. */
    translateZ?: number;
    /** MeshSmith only: scales the mesh by the given factor if set. */
    scale?: number;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Default tool is Blender. Specify another tool if needed. */
    tool?: "Blender" | "MeshSmith" | "FBX2glTF" | "Meshlab";
}

/**
 * Converts geometric mesh data between various file formats. The task is usually executed by the MeshSmith tool,
 * Meshlab and FBX2glTF can also be used if specified explicitly, but these understand less input and output formats.
 * FBX2glTF can only be used if the input format is FBX and the output is either glTF or GLB.
 *
 * Parameters: [[IConvertMeshTaskParameters]].
 * Tools: [[MeshSmithTool]], [[FBX2glTFTool]], [[MeshlabTool]].
 */
export default class ConvertMeshTask extends ToolTask
{
    static readonly taskName = "ConvertMesh";

    static readonly description = "Converts geometric mesh data between various file formats.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputMeshFile: { type: "string", minLength: 1 },
            outputMeshFile: { type: "string", minLength: 1 },
            stripNormals: { type: "boolean", default: false },
            stripTexCoords: { type: "boolean", default: false },
            joinVertices: { type: "boolean", default: false },
            useCompression: { type: "boolean", default: false },
            computeNormals: { type: "string", enum: [ "never", "broken", "missing", "always" ]},
            swizzle: { type: "string", default: undefined },
            alignX: { type: "string", enum: [ "start", "end", "center" ]},
            alignY: { type: "string", enum: [ "start", "end", "center" ]},
            alignZ: { type: "string", enum: [ "start", "end", "center" ]},
            translateX: { type: "number" },
            translateY: { type: "number" },
            translateZ: { type: "number" },
            scale: { type: "number", minimum: 0, default: undefined },
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: { type: "string", enum: [ "Blender", "MeshSmith", "FBX2glTF", "Meshlab" ], default: "Blender" }
        },
        required: [
            "inputMeshFile",
            "outputMeshFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(ConvertMeshTask.parameterSchema);

    constructor(params: IConvertMeshTaskParameters, context: Job)
    {
        super(params, context);

        const inputMeshExt = path.extname(params.inputMeshFile);
        const outputMeshExt = path.extname(params.outputMeshFile);

        // use meshlab if explicitly asked for
        if (params.tool === "Meshlab") {
            const settings: IMeshlabToolSettings = {
                inputMeshFile: params.inputMeshFile,
                outputMeshFile: params.outputMeshFile,
                filters: [],
                timeout: params.timeout
            };

            this.addTool("Meshlab", settings);
        }
        // if conversion is from fbx to glb or gltf, use FBX2glTF
        else if (params.tool === "FBX2glTF" && inputMeshExt === "fbx"
            && (outputMeshExt === "glb" || outputMeshExt === "gltf"))
        {
            const settings: IFBX2glTFToolSettings = {
                inputMeshFile: params.inputMeshFile,
                outputMeshFile: params.outputMeshFile,
                binary: outputMeshExt === "glb",
                compress: params.useCompression,
                computeNormals: params.computeNormals,
                stripNormals: params.stripNormals,
                stripUVs: params.stripTexCoords,
                timeout: params.timeout
            };

            this.addTool("FBX2glTF", settings);
        }
        // for all other purposes, use MeshSmith
        else if (params.tool === "MeshSmith") {
            const settings: IMeshSmithToolSettings = {
                inputFile: params.inputMeshFile,
                outputFile: params.outputMeshFile,
                stripNormals: params.stripNormals,
                stripTexCoords: params.stripTexCoords,
                joinVertices: params.joinVertices,
                swizzle: params.swizzle,
                alignX: params.alignX,
                alignY: params.alignY,
                alignZ: params.alignZ,
                translateX: params.translateX,
                translateY: params.translateY,
                translateZ: params.translateZ,
                scale: params.scale,
                useCompression: params.useCompression,
                timeout: params.timeout
            };

            this.addTool("MeshSmith", settings);
        }
        else {
            const settings: IBlenderToolSettings = {
                inputMeshFile: params.inputMeshFile,
                outputFile: params.outputMeshFile,
                mode: "convert",
                timeout: params.timeout
            };

            this.addTool("Blender", settings);
        }
    }
}