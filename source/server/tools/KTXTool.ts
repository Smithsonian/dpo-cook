/**
 * 3D Foundation Project
 * Copyright 2024 Smithsonian Institution
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

import Tool, { IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IKTXToolSettings extends IToolSettings
{
    /** Name of the RGB input image file. */
    inputImageFile?: string;
    /** Name of the output image file. */
    outputImageFile?: string;
}

export type KTXInstance = ToolInstance<KTXTool, IKTXToolSettings>;

export default class KTXTool extends Tool<KTXTool, IKTXToolSettings>
{
    static readonly toolName = "KTX-Software";

    protected static readonly defaultSettings: Partial<IKTXToolSettings> = {
    };

    async setupInstance(instance: KTXInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;
        let operation = "";

        const inputImagePath = instance.getFilePath(settings.inputImageFile);
        if (!inputImagePath) {
            throw new Error("KTXTool: missing input image");
        }

        const outputImagePath = instance.getFilePath(settings.outputImageFile);
        if (!outputImagePath) {
            throw new Error("KTXTool: missing output map file");
        }

        operation += " create --format R8G8B8_SRGB --generate-mipmap --encode basis-lz --clevel 5 --qlevel 255 ";
        operation += inputImagePath + " " + outputImagePath;

        const command = `"${this.configuration.executable}" ${operation}`;

        return Promise.resolve({ command });
    }
}