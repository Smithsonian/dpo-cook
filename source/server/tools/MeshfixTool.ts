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

import * as path from "path";
import Tool, { IToolOptions } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IMeshfixToolOptions extends IToolOptions
{
    inputMeshFile: string;
    outputMeshFile: string;
    joinComponents?: boolean;
}

export default class MeshfixTool extends Tool
{
    static readonly type: string = "MeshfixTool";

    run(): Promise<void>
    {
        const options = this.options as IMeshfixToolOptions;

        const inputFilePath = this.getFilePath(options.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        }

        const outputFilePath = this.getFilePath(options.outputMeshFile);
        if (!outputFilePath) {
            throw new Error("missing output mesh file");
        }

        const optionString = this.getOptionString(options, outputFilePath);

        const command = `"${this.configuration.executable}" "${inputFilePath}" "${outputFilePath}" ${optionString}`;
        return this.waitInstance(command);
    }

    private getOptionString(options: IMeshfixToolOptions, outputFile: string): string
    {
        let opts = [];

        const extension = path.extname(outputFile);
        if (extension === ".stl") {
            opts.push("-j");
        }

        if (options.joinComponents) {
            opts.push("-a");
        }

        return opts.join(" ");
    }
}