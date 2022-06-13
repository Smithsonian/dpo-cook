/**
 * 3D Foundation Project
 * Copyright 2022 Smithsonian Institution
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
import Tool, { IToolMessageEvent, IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IRawTherapeeToolSettings extends IToolSettings
{
    imageInputFolder: string;
    outputFile?: string;
}

export type RawTherapeeInstance = ToolInstance<RawTherapeeTool, IRawTherapeeToolSettings>;

export default class RawTherapeeTool extends Tool<RawTherapeeTool, IRawTherapeeToolSettings>
{
    static readonly toolName = "RawTherapee";

    protected static readonly defaultSettings: Partial<IRawTherapeeToolSettings> = { };

    onInstanceMessage(event: IToolMessageEvent): boolean
    {
        const { instance, message } = event;
/*
        // keep errors
        if (message.toLowerCase().includes("error")) {
            return false;
        }

        // keep useful messages
        if (message.endsWith(" seconds") || message.endsWith(" sec") || message.endsWith(" points") || message.endsWith(" targets") ||
        message.startsWith("Data preload") || message.startsWith("Adding Scalebar") || message.startsWith("Build") || 
        message.startsWith("Detect") || message.startsWith("Export") || message.startsWith("CPU") || message.startsWith("Peak m") ||  
        message.includes("done by")) {
            if(message.startsWith("optimize") || message.startsWith("loaded ") || message.startsWith("overlap")
            || message.startsWith("calculating") || message.startsWith("setting ") || message.includes("tracks ")
            || message.includes("matches")) {
                return true;
            }
            else {
                return false;
            }
        }
*/
        return true;
    }

    async setupInstance(instance: RawTherapeeInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;

        const inputFolder = instance.getFilePath(path.parse(settings.imageInputFolder).name);
        if (!inputFolder) {
            throw new Error("missing input image set");
        }
        const outputFolder = inputFolder + "_processed";

        // Create profile
        const profileName = "_rawtherapee_" + uniqueId() + ".pp3";
        const profile = [
            `[Exposure]`,
            `Auto=false`,
            `Clip=0.02`,
            `Compensation=0`,
            `Brightness=0`,
            `Contrast=0`,
            `Saturation=0`,
            `Black=0`,
            `HighlightCompr=0`,
            `HighlightComprThreshold=0`,
            `ShadowCompr=50`,
            `HistogramMatching=false`,
            `CurveFromHistogramMatching=false`,
            `ClampOOG=true`,
            `CurveMode=FilmLike`,
            `CurveMode2=Standard`,
            `Curve=0;`,
            `Curve2=0;`,
            
            `[HLRecovery]`,
            `Enabled=false`,   
            `[Retinex]`,
            `Enabled=false`,          
            `[Local Contrast]`,
            `Enabled=false`,       
            `[Channel Mixer]`,
            `Enabled=false`,           
            `[Black & White]`,
            `Enabled=false`,           
            `[Luminance Curve]`,
            `Enabled=false`,       
            `[Sharpening]`,
            `Enabled=false`,
            `[Vibrance]`,
            `Enabled=false`,
            `[SharpenEdge]`,
            `Enabled=false`,
            `[SharpenMicro]`,
            `Enabled=false`,
            
            `[White Balance]`,
            `Enabled=true`,
            `Setting=Camera`,
            `Temperature=5564`,
            `Green=1.0349999999999999`,
            `Equal=1`,
            `TemperatureBias=0`,
            
            `[Color appearance]`,
            `Enabled=false`,
            `[Impulse Denoising]`,
            `Enabled=false`,
            `[Defringing]`,
            `Enabled=false`,
            `[Dehaze]`,
            `Enabled=false`,
            `[Directional Pyramid Denoising]`,
            `Enabled=false`,
            `[EPD]`,
            `Enabled=false`,
            `[FattalToneMapping]`,
            `Enabled=false`,
            `[Shadows & Highlights]`,
            `Enabled=false`,
            `[Crop]`,
            `Enabled=false`,
            
            `[Coarse Transformation]`,
            `Rotate=0`,
            `HorizontalFlip=false`,
            `VerticalFlip=false`,
            
            `[Common Properties for Transformations]`,
            `Method=log`,
            `AutoFill=true`,
            
            `[Rotation]`,
            `Degree=0`,
            
            `[Distortion]`,
            `Amount=0`,
            
            `[LensProfile]`,
            `LcMode=lfauto`,
            `LCPFile=`,
            `UseDistortion=true`,
            `UseVignette=true`,
            `UseCA=false`,
            `LFCameraMake=`,
            `LFCameraModel=`,
            `LFLens=`,
            
            `[Perspective]`,
            `Horizontal=0`,
            `Vertical=0`,
            
            `[Gradient]`,
            `Enabled=false`,
            `[PCVignette]`,
            `Enabled=false`,
            
            `[CACorrection]`,
            `Red=0`,
            `Blue=0`,
            
            `[Vignetting Correction]`,
            `Amount=0`,
            `Radius=50`,
            `Strength=1`,
            `CenterX=0`,
            `CenterY=0`,
            
            `[Resize]`,
            `Enabled=false`,
            
            `[PostDemosaicSharpening]`,
            `Enabled=true`,
            `Contrast=11`,
            `AutoContrast=true`,
            `AutoRadius=true`,
            `DeconvRadius=0.40000000000000002`,
            `DeconvRadiusOffset=0`,
            `DeconvIterCheck=true`,
            `DeconvIterations=20`,
            
            `[PostResizeSharpening]`,
            `Enabled=false`,
            
            `[Color Management]`,
            `InputProfile=(camera)`,
            `ToneCurve=false`,
            `ApplyLookTable=true`,
            `ApplyBaselineExposureOffset=true`,
            `ApplyHueSatMap=true`,
            `DCPIlluminant=0`,
            `WorkingProfile=ProPhoto`,
            `WorkingTRC=none`,
            `WorkingTRCGamma=2.3999999999999999`,
            `WorkingTRCSlope=12.92`,
            `OutputProfile=RTv4_sRGB`,
            `OutputProfileIntent=Relative`,
            `OutputBPC=true`,
            
            `[Wavelet]`,
            `Enabled=false`,      
            `[Directional Pyramid Equalizer]`,
            `Enabled=false`,
            `[HSV Equalizer]`,
            `Enabled=false`,
            `[SoftLight]`,
            `Enabled=false`,
            `[Film Simulation]`,
            `Enabled=false`,
            `[RGB Curves]`,
            `Enabled=false`,
            `[ColorToning]`,
            `Enabled=false`,
            
            `[RAW]`,
            `DarkFrame=/szeva`,
            `DarkFrameAuto=false`,
            `FlatFieldFile=/szeva`,
            `FlatFieldAutoSelect=false`,
            `FlatFieldBlurRadius=32`,
            `FlatFieldBlurType=Area Flatfield`,
            `FlatFieldAutoClipControl=false`,
            `FlatFieldClipControl=0`,
            `CA=true`,
            `CAAvoidColourshift=true`,
            `CAAutoIterations=2`,
            `CARed=0`,
            `CABlue=0`,
            `HotPixelFilter=false`,
            `DeadPixelFilter=false`,
            `HotDeadPixelThresh=100`,
            `PreExposure=1`,
            
            `[RAW Bayer]`,
            `Method=amaze`,
            `Border=4`,
            `ImageNum=1`,
            `CcSteps=0`,
            `PreBlack0=0`,
            `PreBlack1=0`,
            `PreBlack2=0`,
            `PreBlack3=0`,
            `PreTwoGreen=true`,
            `LineDenoise=0`,
            `LineDenoiseDirection=3`,
            `GreenEqThreshold=0`,
            `DCBIterations=2`,
            `DCBEnhance=true`,
            `LMMSEIterations=2`,
            `DualDemosaicAutoContrast=true`,
            `DualDemosaicContrast=20`,
            `PixelShiftMotionCorrectionMethod=1`,
            `PixelShiftEperIso=0`,
            `PixelShiftSigma=1`,
            `PixelShiftShowMotion=false`,
            `PixelShiftShowMotionMaskOnly=false`,
            `pixelShiftHoleFill=true`,
            `pixelShiftMedian=false`,
            `pixelShiftGreen=true`,
            `pixelShiftBlur=true`,
            `pixelShiftSmoothFactor=0.69999999999999996`,
            `pixelShiftEqualBright=false`,
            `pixelShiftEqualBrightChannel=false`,
            `pixelShiftNonGreenCross=true`,
            `pixelShiftDemosaicMethod=amaze`,
            `PDAFLinesFilter=false`,
            
            `[RAW X-Trans]`,
            `Method=3-pass (best)`,
            `DualDemosaicAutoContrast=true`,
            `DualDemosaicContrast=20`,
            `Border=7`,
            `CcSteps=0`,
            `PreBlackRed=0`,
            `PreBlackGreen=0`,
            `PreBlackBlue=0`,
            
            `[MetaData]`,
            `Mode=0`,
            
            `[Film Negative]`,
            `Enabled=false`
        ].join("\n")


        //let operation = ` -w `;
        let operation = ``;

        operation += ` -o "${outputFolder}" -p "${instance.getFilePath(profileName)}" -j100 -c "${inputFolder}"`;

        const command = `"${this.configuration.executable}" ${operation}`;

        return instance.writeFile(profileName, profile).then(() => (Promise.resolve({ command })));
    }
}