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

import LegacyTool, { IToolOptions } from "../app/LegacyTool";

////////////////////////////////////////////////////////////////////////////////

export interface IInstantMeshesToolOptions extends IToolOptions
{
    inputMeshFile: string;
    outputMeshFile: string;
    vertexCount?: number;
    faceCount?: number;
    smooth?: number;
    rosy?: number;
    posy?: number;
    deterministic?: boolean;
    dominant?: boolean;
    intrinsic?: boolean;
}

export default class InstantMeshesTool extends LegacyTool
{
    static readonly type: string = "InstantMeshesTool";

    protected static readonly defaultOptions: Partial<IInstantMeshesToolOptions> = {
    };

    run(): Promise<void>
    {
        const options = this.options as IInstantMeshesToolOptions;

        const inputFilePath = this.getFilePath(options.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        }

        const outputFilePath = this.getFilePath(options.outputMeshFile);
        if (!outputFilePath) {
            throw new Error("missing output mesh file");
        }

        const optionString = this.getOptionString(options);

        const command = `"${this.configuration.executable}" ${optionString} -o "${outputFilePath}" "${inputFilePath}"`;
        return this.waitInstance(command);
    }

    private getOptionString(options: IInstantMeshesToolOptions): string
    {
        let opts = [];

        if (options.vertexCount !== undefined) {
            opts.push(`-v ${options.vertexCount}`);
        }
        if (options.faceCount !== undefined) {
            opts.push(`-f ${options.faceCount}`);
        }
        if (options.smooth !== undefined) {
            opts.push(`-S ${options.smooth}`);
        }
        if (options.rosy !== undefined) {
            opts.push(`-r ${options.rosy}`);
        }
        if (options.posy !== undefined) {
            opts.push(`-p ${options.posy}`);
        }
        if (options.deterministic) {
            opts.push("-d");
        }
        if (options.dominant) {
            opts.push("-D");
        }
        if (options.intrinsic) {
            opts.push("-i");
        }

        return opts.join(" ");
    }
}