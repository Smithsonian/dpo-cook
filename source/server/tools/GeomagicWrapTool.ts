/**
 * 3D Foundation Project
 * Copyright 2025 Smithsonian Institution
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

export interface IGeomagicWrapToolSettings extends IToolSettings
{
    inputMeshFile: string;
    outputMeshFile: string;
    inputUnits: string;
    outputUnits?: string;
    scale?: number;
}

export type GeomagicWrapInstance = ToolInstance<GeomagicWrapTool, IGeomagicWrapToolSettings>;

export default class GeomagicWrapTool extends Tool<GeomagicWrapTool, IGeomagicWrapToolSettings>
{
    static readonly toolName = "GeomagicWrap";

    protected static readonly defaultOptions: Partial<IGeomagicWrapToolSettings> = {
        outputUnits: "mm",
        scale: 1.0
    };

    async setupInstance(instance: GeomagicWrapInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputFilePath = instance.getFilePath(settings.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        }

        const outputFilePath = instance.getFilePath(settings.outputMeshFile);
        if (!outputFilePath) {
            throw new Error("missing output mesh file");
        }

        const outputSTLPath = outputFilePath.replace(".obj", ".stl");
        
        const inUnit = this.getUnitIndex(settings.inputUnits);
        const outUnit = this.getUnitIndex(settings.outputUnits);

        const content = [
            `import _winapi`,
            ``,
            `def kill(pid, exitcode):`,
            `   handle = _winapi.OpenProcess(_winapi.PROCESS_ALL_ACCESS, False, pid)`,
            `   _winapi.TerminateProcess(handle, exitcode)`,
            `   _winapi.CloseHandle(handle)`,
            ``,
            `pid = os.getpid()`,
            ``,
            `try:`,
            `   geo.open(0, 1, u${JSON.stringify(inputFilePath)})`,
            `   geo.modify_units(1, 0, ${inUnit})`,
            `   geo.modify_units(0, 1, ${outUnit})`,
            `   geo.mesh_doctor("smallcompsize", 2.6714e-05, "smalltunnelsize", 1.3357e-05, "holesize", 1.3357e-05, "degeneracytol", 1.069e-09, "spikesens", 50, "spikelevel", 0.5, "defeatureoption", 2, "fillholeoption", 2, "autoexpand", 2, "operations", "IntersectionCheck+", "SmallComponentCheck+", "SpikeCheck+", "HighCreaseCheck+", "Update", "Auto-Repair")`,
            `   geo.scale_model(0, ${settings.scale}, 1, 1, 1, 0, 0, 20, 1, 1, 0)`,
            `   geo.saveas(u${JSON.stringify(outputFilePath)}, 10, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, -1, 0, 1, 0)`,
            `   geo.saveas(u${JSON.stringify(outputSTLPath)}, 3, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, -1, 0, 1, 0)`,
            `except:`,
            `   kill(pid, 1)`,
            ``,
            `kill(pid, 0)`
        ].join("\n");

        const fileName = "_GeomagicWrap_" + uniqueId() + ".py";

        //const command = `"${this.configuration.executable}" -input "${instance.getFilePath(inputFilePath)}" -script "${instance.getFilePath(fileName)}" -output "${instance.getFilePath(outputFilePath)}"`;

        const command = `"${this.configuration.executable}" -script "${instance.getFilePath(fileName)}"`;

        return instance.writeFile(fileName, content).then(() => ({
            command,
            script: { fileName, content }
        }));
    }

    protected getUnitIndex(units: string) : number 
    {
        let unit = -1;
        switch(units) {
            case "in":
                unit = 0;
                break;
            case "mm":
                unit = 1;
                break;
            case "ft":
                unit = 2;
                break;
            case "cm":
                unit = 3;
                break;
            case "m":
                unit = 4;
                break;
            default:
                throw new Error("Unit not supported in Geomagic");
        }
        return unit;
    }
}