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

import Tool, { IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface ICscriptToolSettings extends IToolSettings
{
    scriptToExecute: string;
}

export type CscriptInstance = ToolInstance<CscriptTool, ICscriptToolSettings>;

export default class CscriptTool extends Tool<CscriptTool, ICscriptToolSettings>
{
    static readonly toolName = "Cscript";

    protected static readonly defaultSettings: Partial<ICscriptToolSettings> = { };

    async setupInstance(instance: CscriptInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const command = `"${this.configuration.executable}" ${settings.scriptToExecute}`;

        return Promise.resolve({ command });
    }
}