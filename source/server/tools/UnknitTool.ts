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

import uniqueId from "../utils/uniqueId";
import Tool, { IToolOptions, IToolScript } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IUnknitToolOptions extends IToolOptions
{
    inputMeshFile: string;
    outputMeshFile: string;
    mapSize: number;
    stretchValue?: number;
    packIterations?: number;
    packRotations?: number;
    packAllowFlip?: boolean;
    packExtend?: boolean;
    showUI?: boolean;
}

export default class UnknitTool extends Tool
{
    static readonly type: string = "UnknitTool";

    protected static readonly defaultOptions: Partial<IUnknitToolOptions> = {
        mapSize: 2048,
        stretchValue: 1,
        packIterations: 40,
        packRotations: 8,
        packAllowFlip: true,
        packExtend: true,
        showUI: false
    };

    run(): Promise<void>
    {
        const options = this.options as IUnknitToolOptions;
        let silentOptions = options.showUI ? "" : "-q -silent -mip";

        return this.writeToolScript()
            .then(script => {
                const command = `"${this.configuration.executable}" ${silentOptions} -U MAXScript "${script.filePath}"`;
                return this.waitInstance(command, script);
            });
    }

    private writeToolScript(): Promise<IToolScript>
    {
        const options = this.options as IUnknitToolOptions;

        const inputFilePath = this.getFilePath(options.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        }

        const outputFilePath = this.getFilePath(options.outputMeshFile);
        if (!outputFilePath) {
            throw new Error("missing output mesh file");
        }

        // stringify puts strings in quotes and escapes special characters
        const inputFileString = JSON.stringify(inputFilePath);
        const outputFileString = JSON.stringify(outputFilePath);

        // MaxScript automation for Autodesk 3ds Max
        const scriptContent = [
            "resetMaxFile #noprompt",
            `importFile ${inputFileString} #noPrompt`,
            "completeRedraw()",
            "rollout automation \"Automation Script\"",
            "(",
            "  timer clock \"my\" interval:1000",
            "  on clock tick do",
            "  (",
            "    clock.active = false",
            "    setCommandPanelTaskMode #modify",
            "    unknitModifier = UVW_Unknit()",
            "    modPanel.addModToSelection (unknitModifier) ui:on",
            "    $.modifiers[#UVW_Unknit].packUVs = 1",
            `    $.modifiers[#UVW_Unknit].stretchValue = ${options.stretchValue}`,
            "    $.modifiers[#UVW_Unknit].UVChannel = 1",
            `    $.modifiers[#UVW_Unknit].packSize = ${options.mapSize}`,
            `    $.modifiers[#UVW_Unknit].packIterations = ${options.packIterations}`,
            `    $.modifiers[#UVW_Unknit].packRotations = ${options.packRotations}`,
            `    $.modifiers[#UVW_Unknit].packAllowFlip = ${options.packAllowFlip ? "on" : "off"}`,
            `    $.modifiers[#UVW_Unknit].packExtend = ${options.packExtend ? "on" : "off"}`,
            "    completeRedraw()",
            "    $.modifiers[#UVW_Unknit].Apply()",
            `    exportFile ${outputFileString} #noPrompt`,
            "    quitMax #noPrompt",
            "  )",
            ")",
            "createDialog automation"
        ].join("\n");

        const scriptFileName = "_3dsmax_unknit_" + uniqueId() + ".ms";
        const scriptFilePath = this.getFilePath(scriptFileName);
        return this.writeFile(scriptFilePath, scriptContent);
    }
}
