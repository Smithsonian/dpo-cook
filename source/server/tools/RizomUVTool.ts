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
import uniqueId from "../utils/uniqueId";

import Tool, { IToolOptions, IToolScript } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IRizomUVToolOptions extends IToolOptions
{
    inputMeshFile: string;
    outputMeshFile: string;
    saveObj?: boolean;
    saveFbx?: boolean;
    saveCollada?: boolean;
    cutSegmentationStrength?: number;
    cutHandles?: boolean;
    rizomIterations?: number;
    rizomNoTriangleFlips?: boolean;
    rizomNoBorderIntersections?: boolean;
    packResolution?: number;
    packMutations?: number;
    packMargin?: number;
    packSpacing?: number;
    packRotateMin?: number;
    packRotateMax?: number;
    packRotateStep?: number;
}

export default class RizomUVTool extends Tool
{
    static readonly type: string = "RizomUVTool";

    protected static readonly defaultOptions: Partial<IRizomUVToolOptions> = {
        cutSegmentationStrength: 0.65,
        cutHandles: false,
        rizomIterations: 5,
        rizomNoTriangleFlips: true,
        rizomNoBorderIntersections: true,
        packResolution: 500,
        packMutations: 1,
        packMargin: 2/1024,
        packSpacing: 4/1024,
        packRotateMin: 0,
        packRotateMax: 180,
        packRotateStep: 30
    };

    run(): Promise<void>
    {
        return this.writeToolScript()
            .then(script => {
                const command = `"${this.configuration.executable}" -cfi "${script.filePath}"`;
                return this.waitInstance(command, script);
            });
    }

    private writeToolScript(): Promise<IToolScript>
    {
        const options = this.options as IRizomUVToolOptions;

        const inputFilePath = this.getFilePath(options.inputMeshFile);
        if (!inputFilePath) {
            throw new Error("missing input mesh file");
        }

        const outputFilePath = this.getFilePath(options.outputMeshFile);
        if (!outputFilePath) {
            throw new Error("missing output mesh file");
        }

        const outputFileExt = path.extname(outputFilePath);
        const outputFileBase = outputFilePath.substring(0, outputFilePath.length - outputFileExt.length);

        const saveOperations = [];

        if (outputFileExt === ".obj" || options.saveObj) {
            saveOperations.push(`ZomSave({File={Path=${JSON.stringify(outputFileBase + ".obj")}, UVWProps=true, FBX={FormatDescriptor="Alias OBJ (*.obj)"}}, __UpdateUIObjFileName=true})`);
        }
        if (outputFileExt === ".fbx" || options.saveFbx) {
            saveOperations.push(`ZomSave({File={Path=${JSON.stringify(outputFileBase + ".fbx")}, UVWProps=true, FBX={FormatDescriptor="FBX binary (*.fbx)"}}, __UpdateUIObjFileName=true})`);
        }
        if (outputFileExt === ".dae" || options.saveCollada) {
            saveOperations.push(`ZomSave({File={Path=${JSON.stringify(outputFileBase + ".dae")}, UVWProps=true, FBX={FormatDescriptor="Collada DAE (*.dae)"}}, __UpdateUIObjFileName=true})`);
        }

        if (saveOperations.length === 0) {
            throw new Error("no save operation specified, result won't be saved");
        }

        const scriptContent = [
            `ZomResetPrefs(none)`,
            `ZomLoad({File={Path=${JSON.stringify(inputFilePath)}, ImportGroups=true, XYZ=true}, NormalizeUVW=true})`,

            `-- auto-select seams using mosaic algorithm --`,
            `ZomSelect({PrimType="Edge", Select=true, ResetBefore=true, WorkingSetPrimType="Island", ProtectMapName="Protect", FilterIslandVisible=true, Auto={QuasiDevelopable={Developability=${options.cutSegmentationStrength}, IslandPolyNBMin=2, FitCones=false, Straighten=true}, HandleCutter=true, StretchLimiter=true, SkeletonUnoverlap={SegLevel=1, FromRoot=true, Smooth=2}, FlatteningMode=0, SQS=0.0357143, SQP=0.5, AQS=0.000178571, AQP=0.5}})`,
            //`ZomSelect({PrimType="Edge", Select=true, ResetBefore=true, WorkingSetPrimType="Island", ProtectMapName="Protect", FilterIslandVisible=true, Auto={QuasiDevelopable={Developability=${options.cutSegmentationStrength}, IslandPolyNBMin=1, FitCones=false, Straighten=true}, HandleCutter=${options.cutHandles}}})`,
            `ZomCut({PrimType="Edge"})`,

            `-- unwrap --`,
            `ZomUnfold({PrimType="Edge", MinAngle=1e-05, Mix=1, Iterations=${options.rizomIterations}, PreIterations=5, StopIfOutOFDomain=false, RoomSpace=0, PinMapName="Pin", ProcessNonFlats=true, ProcessSelection=true, ProcessAllIfNoneSelected=true, ProcessJustCut=true, BorderIntersections=${!!options.rizomNoBorderIntersections}, TriangleFlips=${!!options.rizomNoTriangleFlips}})`,

            `-- pack --`,
            `ZomIslandGroups({Mode="DistributeInTilesByBBox", MergingPolicy=8322})`,
            `ZomIslandGroups({Mode="DistributeInTilesEvenly", MergingPolicy=8322, UseTileLocks=true, UseIslandLocks=true})`,
            `ZomPack({ProcessTileSelection=false, RootGroup="RootGroup", RecursionDepth=1, MaxMutations=${options.packMutations}, Resolution=${options.packResolution}, MarginSize=${options.packMargin}, SpacingSize=${options.packSpacing}, Scaling={Mode=2}, Rotate={Min=${options.packRotateMin}, Max=${options.packRotateMax}, Step=${options.packRotateStep}}, Translate=true, LayoutScalingMode=2})`,

            `-- save mesh --`,
            saveOperations.join("\n"),
            `ZomQuit()`
        ].join("\n");

        const scriptFileName = "_rizomuv_" + uniqueId() + ".lua";
        const scriptFilePath = this.getFilePath(scriptFileName);

        return this.writeFile(scriptFilePath, scriptContent);
    }
}