/**
 * 3D Foundation Project
 * Copyright 2022 Smithsonian Institution
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

import { IMetashapeToolSettings } from "../tools/MetashapeTool";
import { IRealityCaptureToolSettings } from "../tools/RealityCaptureTool";
import { IMeshroomToolSettings } from "../tools/MeshroomTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";


////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[PhotogrammetryTask]] */
export interface IPhotogrammetryTaskParameters extends ITaskParameters
{
    /** Input image folder. */
    inputImageFolder: string;
    /** Alignment image folder. */
    alignImageFolder?: string;
	/** Mask image folder. */
    maskImageFolder?: string;
    /** Base name used for output files */
    outputFile: string;
    /** Name used for saved camera position file */
    camerasFile: string;
    /** CSV file with scalebar markers and distances */
    scalebarFile: string;
    /** Flag to enable discarding high-error markers */
    optimizeMarkers: boolean;
    /** Percent success required to pass alignment stage */
    alignmentLimit?: number;
    /** Max number of tiepoints */
    tiepointLimit?: number;
    /** Max number of keypoints */
    keypointLimit?: number;
    /** Flag to process images as SI-formatted turntable groups */
    turntableGroups?: boolean;
    /** Max neighbors value to use for depth map generation in Metashape */
    depthMaxNeighbors?: number;
    /** Flag = true to use generic preselection in Metashape */
    genericPreselection?: boolean;
    /** Preset for mesh quality ("Low", "Medium", "High", "Highest", "Custom") */
    meshQuality?: string;
    /** If meshQuality is custom, this defines the goal face count */
    customFaceCount?: number;
    /** Preset for depth map quality ("Low", "Medium", "High", "Highest") */
    depthMapQuality?: string;
    /** Desired masking operation */
    maskMode?: "File" | "Background";
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** Tool to use for photogrammetry ("Metashape" or "RealityScan" or "Meshroom", default: "Metashape"). */
    tool?: "Metashape" | "RealityScan" | "Meshroom";
}

/**
 * Generates a mesh and texture from an image set
 *
 * Parameters: [[IPhotogrammetryTaskParameters]]
 * Tools: [[MetashapeTool]], [[RealityCaptureTool]]
 */
export default class PhotogrammetryTask extends ToolTask
{
    static readonly taskName = "Photogrammetry";

    static readonly description = "Generates a mesh and texture from an image set using photogrammetry techniques.";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            inputImageFolder: { type: "string", minLength: 1 },
            alignImageFolder: { type: "string", minLength: 1 },
			maskImageFolder: { type: "string", minLength: 1 },
            outputFile: { type: "string", minLength: 1 },
            camerasFile: { type: "string", minLength: 1 },
            scalebarFile: { type: "string", minLength: 1 },
            optimizeMarkers: { type: "boolean", default: false},
            alignmentLimit: { type: "number", default: 50},
            tiepointLimit: { type: "integer", default: 25000},
            keypointLimit: { type: "integer", default: 75000},
            turntableGroups: { type: "boolean", default: false},
            depthMaxNeighbors: { type: "integer", default: 16},
            genericPreselection: { type: "boolean", default: true},
            meshQuality: { type: "string", enum: [ "Low", "Medium", "High", "Custom" ], default: "High"},
            customFaceCount: { type: "integer", default: 3000000},
            depthMapQuality: { type: "string", enum: [ "Low", "Medium", "High", "Highest" ], default: "Highest"},
            maskMode: { type: "string", enum: [ "File", "Background" ], default: "File"},
            timeout: { type: "integer", default: 0 },
            tool: { type: "string", enum: [ "Metashape", "RealityScan", "Meshroom" ], default: "Metashape" }
        },
        required: [
            "inputImageFolder",
            "outputFile",
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(PhotogrammetryTask.parameterSchema);

    constructor(params: IPhotogrammetryTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "Metashape") {
            const toolOptions: IMetashapeToolSettings = {
                imageInputFolder: params.inputImageFolder,
                alignImageFolder: params.alignImageFolder,
				maskImageFolder: params.maskImageFolder,
                outputFile: params.outputFile,
                camerasFile: params.camerasFile,
                scalebarFile: params.scalebarFile,
                optimizeMarkers: params.optimizeMarkers,
                alignmentLimit: params.alignmentLimit,
                tiepointLimit: params.tiepointLimit,
                keypointLimit: params.keypointLimit,
                turntableGroups: params.turntableGroups,
                depthMaxNeighbors: params.depthMaxNeighbors,
                genericPreselection: params.genericPreselection,
                meshQuality: params.meshQuality,
                customFaceCount: params.customFaceCount,
                depthMapQuality: params.depthMapQuality,
                maskMode: params.maskMode,
                mode: "full",
                timeout: params.timeout
            };

            this.addTool("Metashape", toolOptions);
        }
        else if (params.tool === "RealityScan") {
            const toolOptions: IRealityCaptureToolSettings = {
                imageInputFolder: params.inputImageFolder,
                alignImageFolder: params.alignImageFolder,
                outputFile: params.outputFile,
                scalebarFile: params.scalebarFile,
                keypointLimit: params.keypointLimit,
                meshQuality: params.meshQuality,
                customFaceCount: params.customFaceCount,
                optimizeMarkers: params.optimizeMarkers,
                timeout: params.timeout
            };

            this.addTool("RealityScan", toolOptions);
        }
        else if (params.tool === "Meshroom") {
            const toolOptions: IMeshroomToolSettings = {
                imageInputFolder: params.inputImageFolder,
                outputFile: params.outputFile,
                scalebarFile: params.scalebarFile,
                timeout: params.timeout
            };

            this.addTool("Meshroom", toolOptions);
        }
        else {
            throw new Error("PhotogrammetryTask.constructor - unknown tool: " + params.tool);
        }
    }
}