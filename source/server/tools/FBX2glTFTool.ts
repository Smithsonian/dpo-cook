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

import Tool, { IToolOptions } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export type TFBX2glTFComputeNormals = "never" | "broken" | "missing" | "always";

export interface IFBX2glTFToolOptions extends IToolOptions
{
    inputMeshFile: string;
    outputMeshFile: string;
    binary?: boolean;
    compress?: boolean;
    computeNormals?: TFBX2glTFComputeNormals;
    stripNormals?: boolean;
    stripUVs?: boolean;
}

export default class FBX2glTFTool extends Tool
{
    static readonly type: string = "FBX2glTFTool";

    protected static readonly defaultOptions: Partial<IFBX2glTFToolOptions> = {
        binary: true,
        compress: true,
        stripNormals: false,
        stripUVs: false
    };

    run(): Promise<void>
    {
        const options = this.options as IFBX2glTFToolOptions;

        const inputFilePath = this.getFilePath(options.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        }

        const outputFilePath = this.getFilePath(options.outputMeshFile);
        if (!outputFilePath) {
            throw new Error("missing output mesh file");
        }

        const optionString = this.getOptionString(options);

        const command = `"${this.configuration.executable}" -i "${inputFilePath}" -o "${outputFilePath}" ${optionString}`;
        return this.waitInstance(command);
    }

    private getOptionString(options: IFBX2glTFToolOptions): string
    {
        let opts = [];

        if (options.binary) {
            opts.push("--binary");
        }
        if (options.compress) {
            opts.push("--draco");
        }
        if (options.computeNormals) {
            opts.push("--compute-normals " + options.computeNormals);
        }
        if (options.stripNormals || options.stripUVs) {
            opts.push("--keep-attribute position");
            if (!options.stripNormals) {
                opts.push("normal");
            }
            if (!options.stripUVs) {
                opts.push("uv0 uv1");
            }
        }

        return opts.join(" ");
    }
}