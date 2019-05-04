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

import Tool, { IToolOptions } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IRealityCaptureToolOptions extends IToolOptions
{
    inputImageFolderName: string;
}

export default class RealityCaptureTool extends Tool
{
    static readonly type: string = "RealityCaptureTool";

    protected static readonly defaultOptions: Partial<IRealityCaptureToolOptions> = {
        inputImageFolderName: ""
    };

    run(): Promise<void>
    {
        const options = this.options as IRealityCaptureToolOptions;

        const inputImageFolderName = this.getFilePath(options.inputImageFolderName);
        if (!inputImageFolderName) {
            throw new Error("RealityCaptureTool: missing image folder name");
        }

        let operations = "";

        const command = `"${this.configuration.executable}" ${operations}`;
        return this.waitInstance(command);
    }
}