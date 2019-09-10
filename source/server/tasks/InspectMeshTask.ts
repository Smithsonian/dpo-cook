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

import * as fs from "fs-extra";

import Job from "../app/Job";

import MeshlabTool, { IMeshlabToolSettings } from "../tools/MeshlabTool";
import MeshSmithTool, { IMeshSmithToolSettings } from "../tools/MeshSmithTool";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask, { IToolMessageEvent, ToolInstance } from "../app/ToolTask";

import { IDecimateMeshTaskParameters } from "./DecimateMeshTask";


////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[InspectMeshTask]]. */
export interface IInspectMeshTaskParameters extends ITaskParameters
{
    /** File name of the mesh to be inspected. */
    meshFile: string;
    /** If given, the resulting report will be stored in a file with this name. */
    reportFile?: string;
    /** Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup, see [[IToolConfiguration]]). */
    timeout?: number;
    /** The inspection tool to be used, either "Meshlab" or "MeshSmith". Default is Meshlab. */
    tool?: "Meshlab" | "MeshSmith";
}

/**
 * Inspects a given mesh and provides a detailed report with
 * topological and geometric features, including
 * - manifoldness
 * - watertightness
 * - bounding box
 * - barycenter
 * - volume
 *
 * Parameters: [[IInspectMeshTaskParameters]]
 */
export default class InspectMeshTask extends ToolTask
{
    static readonly taskName = "InspectMesh";

    static readonly description = "Inspects a given mesh and provides a detailed report " +
                                  "including topological and geometric features";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            meshFile: { type: "string", minLength: 1 },
            reportFile: { type: "string", minLength: 1, default: undefined },
            timeout: { type: "integer", minimum: 0, default: 0 },
            tool: { type: "string", enum: [ "Meshlab", "MeshSmith" ], default: "Meshlab" }
        },
        required: [
            "meshFile"
        ],
        additionalProperties: false
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(InspectMeshTask.parameterSchema);

    constructor(params: IInspectMeshTaskParameters, context: Job)
    {
        super(params, context);

        if (params.tool === "Meshlab") {
            const settings: IMeshlabToolSettings = {
                inputMeshFile: params.meshFile,
                filters: [{
                    name: "MeshReport"
                }],
                timeout: params.timeout
            };

            this.addTool("Meshlab", settings);
        }
        else if (params.tool === "MeshSmith") {
            const settings: IMeshSmithToolSettings = {
                inputFile: params.meshFile,
                //outputFile: params.reportFile,
                report: true,
                timeout: params.timeout
            };

            this.addTool("MeshSmith", settings);
        }
        else {
            throw new Error("InspectMeshTask.constructor - unknown tool: " + params.tool);
        }
    }

    protected async instanceDidExit(instance: ToolInstance)
    {
        if (instance.tool instanceof MeshlabTool || instance.tool instanceof MeshSmithTool) {

            const results = instance.report.execution.results;
            const inspection = results && results["inspection"];

            if (inspection) {
                this.report.result["inspection"] = inspection;

                const reportFile = (this.parameters as IInspectMeshTaskParameters).reportFile;

                if (reportFile) {
                    const reportFilePath = instance.getFilePath(reportFile);
                    return fs.writeFile(reportFilePath, JSON.stringify(inspection, null, 2), "utf8");
                }
            }
        }

        return Promise.resolve();
    }
}