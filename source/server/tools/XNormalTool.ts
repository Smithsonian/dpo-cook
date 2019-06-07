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
import Tool, { IToolOptions, IToolScript, TToolState } from "../app/Tool";

////////////////////////////////////////////////////////////////////////////////

export interface IXNormalToolOptions extends IToolOptions
{
    highPolyMeshFile: string;
    lowPolyUnwrappedMeshFile: string;
    highPolyDiffuseMapFile?: string;
    mapBaseName: string;
    mapSize: number;
    maxRayDistance?: number;
    bakeDiffuse?: boolean;
    bakeOcclusion?: boolean;
    occlusionRays?: number;
    occlusionConeAngle?: number;
    occlusionAttConstant?: number;
    occlusionAttLinear?: number;
    occlusionAttQuadratic?: number;
    bakeNormals?: boolean;
    tangentSpaceNormals?: boolean;
    normalsFlipX?: boolean;
    normalsFlipY?: boolean;
    normalsFlipZ?: boolean;
    bakeCavity?: boolean;
    bakeTest?: boolean;
}

export default class XNormalTool extends Tool
{
    static readonly type: string = "XNormalTool";

    protected static readonly defaultOptions: Partial<IXNormalToolOptions> = {
        mapSize: 2048,
        maxRayDistance: 0.001,
        occlusionRays: 192,
        occlusionConeAngle: 170,
        occlusionAttConstant: 1,
        occlusionAttLinear: 0,
        occlusionAttQuadratic: 0
    };

    run(): Promise<void>
    {
        return this.writeToolScript()
            .then(script => {
                const command = `"${this.configuration.executable}" "${script.filePath}"`;
                return this.waitInstance(command, script);
            });
    }

    protected onExit(time: Date, error: Error, code: number, endState: TToolState)
    {
        if (!error && endState === "done") {
            const options = this.options as IXNormalToolOptions;
            const mapPath = this.getFilePath(options.mapBaseName);
            const mapExt = path.extname(mapPath);
            const mapBasePath = mapPath.substring(0, mapPath.length - mapExt.length);

            if (options.bakeDiffuse && options.highPolyDiffuseMapFile) {
                this.renameFile(`${mapBasePath}_baseTexBaked${mapExt}`, `${mapBasePath}-diffuse${mapExt}`);
            }
            if (options.bakeOcclusion) {
                this.renameFile(`${mapBasePath}_occlusion${mapExt}`, `${mapBasePath}-occlusion${mapExt}`);
            }
            if (options.bakeNormals) {
                this.renameFile(`${mapBasePath}_normals${mapExt}`, `${mapBasePath}-normals${mapExt}`);
            }
            if (options.bakeTest) {
                this.renameFile(`${mapBasePath}_wire_rays${mapExt}`, `${mapBasePath}-test${mapExt}`);
            }
        }
    }

    private writeToolScript(): Promise<IToolScript>
    {
        const options = this.options as IXNormalToolOptions;

        if (!options.mapSize) {
            throw new Error("XNormalTool.writeTaskScript - missing mapSize option");
        }

        const highPolyMeshPath = this.getFilePath(options.highPolyMeshFile);
        if (!highPolyMeshPath) {
            throw new Error("XNormalTool.writeTaskScript - missing highres mesh file");
        }

        const lowPolyMeshPath = this.getFilePath(options.lowPolyUnwrappedMeshFile);
        if (!lowPolyMeshPath) {
            throw new Error("XNormalTool.writeTaskScript - missing lowres mesh file");
        }

        const maxRayDistance = options.maxRayDistance;
        const edgePadding = options.mapSize / 512; // 1k = 2, 2k = 4, 4k = 8

        const tangentSpace = options.tangentSpaceNormals;
        const swizzleX = options.normalsFlipX ? "X-" : "X+";
        const swizzleY = options.normalsFlipY ? "Y-" : "Y+";
        const swizzleZ = options.normalsFlipZ ? "Z-" : "Z+";

        const aoRays = options.occlusionRays;
        const aoConeAngle = options.occlusionConeAngle;
        const aoAttC = options.occlusionAttConstant;
        const aoAttL = options.occlusionAttLinear;
        const aoAttQ = options.occlusionAttQuadratic;

        const aoDistribution = "Cosine"; // Uniform or Cosine
        const aoLimitRayDistance = false; // default false
        const aoBias = 0.005;

        const highpolyDiffuseMapPath = this.getFilePath(options.highPolyDiffuseMapFile);
        const bakeDiffuse = !!options.bakeDiffuse && !!highpolyDiffuseMapPath;

        if (!options.mapBaseName) {
            throw new Error("XNormalTool.writeTaskScript - missing output base map path");
        }

        const mapBaseFilePath = this.getFilePath(options.mapBaseName);

        const scriptContent = [
            `<?xml version="1.0" encoding="UTF-8"?>`,
            `<Settings xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="3.19.3">`,
            `  <HighPolyModel DefaultMeshScale="1.000000">`,
            `    <Mesh Visible="true" File="${highPolyMeshPath}" Scale="1.000000" IgnorePerVertexColor="true" AverageNormals="AverageNormals" BaseTexIsTSNM="false" PositionOffset="0.0000;0.0000;0.0000" ${bakeDiffuse ? `BaseTex="${highpolyDiffuseMapPath}"` : ""} />`,
            `  </HighPolyModel>`,

            `  <LowPolyModel DefaultMeshScale="1.000000">`,
            `    <Mesh Visible="true" File="${lowPolyMeshPath}" Scale="1.000000" AverageNormals="AverageNormals" MaxRayDistanceFront="${maxRayDistance}" MaxRayDistanceBack="${maxRayDistance}" UseCage="false" NormapMapType="Tangent-space" UsePerVertexColors="true" UseFresnel="false" FresnelRefractiveIndex="1.330000" ReflectHDRMult="1.000000" VectorDisplacementTS="false" VDMSwizzleX="X+" VDMSwizzleY="Y+" VDMSwizzleZ="Z+" BatchProtect="false" CastShadows="true" ReceiveShadows="true" BackfaceCull="true" NMSwizzleX="X+" NMSwizzleY="Y+" NMSwizzleZ="Z+" HighpolyNormalsOverrideTangentSpace="true" TransparencyMode="None" AlphaTestValue="127" Matte="false" MatchUVs="false" UOffset="0.000000" VOffset="0.000000" PositionOffset="0.0000;0.0000;0.0000"/>`,
            `  </LowPolyModel>`,

            `  <GenerateMaps `,
            `      File="${mapBaseFilePath}" Width="${options.mapSize}" Height="${options.mapSize}" EdgePadding="${edgePadding}"`,
            `      BucketSize="64" ClosestIfFails="true" DiscardRayBackFacesHits="true" AA="1"`,
            `      BakeHighpolyVCols="false"`,
            `      GenDerivNM="false"`,

            `      GenNormals="${options.bakeNormals}" TangentSpace="${tangentSpace}" SwizzleX="${swizzleX}" SwizzleY="${swizzleY}" SwizzleZ="${swizzleZ}"`,
            `      GenAO="${options.bakeOcclusion}" AORaysPerSample="${aoRays}" AODistribution="${aoDistribution}" AOConeAngle="${aoConeAngle}" AOBias="${aoBias}" AOAllowPureOccluded="true" AOLimitRayDistance="${aoLimitRayDistance}" AOAttenConstant="${aoAttC}" AOAttenLinear="${aoAttL}" AOAttenCuadratic="${aoAttQ}" AOJitter="false" AOIgnoreBackfaceHits="false"`,
            `      BakeHighpolyBaseTex="${bakeDiffuse}" BakeHighpolyBaseTextureDrawObjectIDIfNoTexture="false"`,
            `      GenCavity="${options.bakeCavity}" CavityRaysPerSample="${aoRays}" CavityJitter="false" CavitySearchRadius="0.500000" CavityContrast="1.250000" CavitySteps="4"`,

            `      GenHeights="false" HeightTonemap="Interactive" HeightTonemapMin="-100.000000" HeightTonemapMax="100.000000"`,
            `      GenBent="false" BentRaysPerSample="128" BentConeAngle="162.000000" BentBias="0.080000" BentTangentSpace="false" BentLimitRayDistance="false" BentJitter="false" BentDistribution="Uniform" BentSwizzleX="X+" BentSwizzleY="Y+" BentSwizzleZ="Z+"`,
            `      GenPRT="false" PRTRaysPerSample="128" PRTConeAngle="179.500000" PRTBias="0.080000" PRTLimitRayDistance="false" PRTJitter="false" PRTNormalize="true" PRTThreshold="0.005000"`,
            `      GenConvexity="false" ConvexityScale="1.000000"`,
            `      GenThickness="false"`,
            `      GenProximity="false" ProximityRaysPerSample="128" ProximityConeAngle="80.000000" ProximityLimitRayDistance="true" ProximityFlipNormals="false" ProximityFlipValue="false"`,
            `      GenDirections="false" DirectionsTS="false" DirectionsSwizzleX="X+" DirectionsSwizzleY="Y+" DirectionsSwizzleZ="Z+" DirectionsTonemap="Interactive" DirectionsTonemapMin="false" DirectionsTonemapMax="false"`,
            `      GenRadiosityNormals="false" RadiosityNormalsRaysPerSample="128" RadiosityNormalsDistribution="Uniform" RadiosityNormalsConeAngle="162.000000" RadiosityNormalsBias="0.080000" RadiosityNormalsLimitRayDistance="false" RadiosityNormalsAttenConstant="1.000000" RadiosityNormalsAttenLinear="0.000000" RadiosityNormalsAttenCuadratic="0.000000" RadiosityNormalsJitter="false" RadiosityNormalsContrast="1.000000" RadiosityNormalsEncodeAO="true" RadiosityNormalsCoordSys="AliB" RadiosityNormalsAllowPureOcclusion="false"`,
            `      GenCurv="false" CurvRaysPerSample="128" CurvBias="0.000100" CurvConeAngle="162.000000" CurvJitter="false" CurvSearchDistance="1.000000" CurvTonemap="3Col" CurvDistribution="Cosine" CurvAlgorithm="Average" CurvSmoothing="true"`,
            `      GenTranslu="false" TransluRaysPerSample="128" TransluDistribution="Uniform" TransluConeAngle="162.000000" TransluBias="0.000500" TransluDist="1.000000" TransluJitter="false"`,

            `      GenWireRays="${options.bakeTest}" RenderRayFails="true" RenderWireframe="true"`,
            `  >`,
            `    <NMBackgroundColor R="128" G="128" B="255"/>`,
            `    <AOOccludedColor R="0" G="0" B="0"/>`,
            `    <AOUnoccludedColor R="255" G="255" B="255"/>`,
            `    <AOBackgroundColor R="255" G="255" B="255"/>`,
            `    <BakeHighpolyBaseTextureNoTexCol R="255" G="0" B="0"/>`,
            `    <BakeHighpolyBaseTextureBackgroundColor R="0" G="0" B="0"/>`,
            `    <CavityBackgroundColor R="255" G="255" B="255"/>`,

            `    <HMBackgroundColor R="0" G="0" B="0"/>`,
            `    <BentBackgroundColor R="127" G="127" B="255"/>`,
            `    <PRTBackgroundColor R="0" G="0" B="0"/>`,
            `    <ProximityBackgroundColor R="255" G="255" B="255"/>`,
            `    <ConvexityBackgroundColor R="255" G="255" B="255"/>`,
            `    <RenderWireframeCol R="255" G="255" B="255"/>`,
            `    <RenderCWCol R="0" G="0" B="255"/>`,
            `    <RenderSeamCol R="0" G="255" B="0"/>`,
            `    <RenderRayFailsCol R="255" G="0" B="0"/>`,
            `    <RenderWireframeBackgroundColor R="0" G="0" B="0"/>`,
            `    <VDMBackgroundColor R="0" G="0" B="0"/>`,
            `    <RadNMBackgroundColor R="0" G="0" B="0"/>`,
            `    <BakeHighpolyVColsBackgroundCol R="255" G="255" B="255"/>`,
            `    <CurvBackgroundColor R="0" G="0" B="0"/>`,
            `    <DerivNMBackgroundColor R="127" G="127" B="0"/>`,
            `    <TransluBackgroundColor R="0" G="0" B="0"/>`,
            `  </GenerateMaps>`,

            `  <Detail Scale="0.500000" Method="4Samples"/>`,

            `  <Viewer3D ShowGrid="true" ShowWireframe="false" ShowTangents="false" ShowNormals="false" ShowBlockers="false" MaxTessellationLevel="0" LightIntensity="1.000000" LightIndirectIntensity="0.000000" Exposure="0.180000" HDRThreshold="0.900000" UseGlow="true" GlowIntensity="1.000000" SSAOEnabled="false" SSAOBright="1.100000" SSAOContrast="1.000000" SSAOAtten="1.000000" SSAORadius="0.250000" SSAOBlurRadius="2.000000" ParallaxStrength="0.000000" ShowHighpolys="true" ShowAO="false" CageOpacity="0.700000" DiffuseGIIntensity="1.000000" CastShadows="false" ShadowBias="0.100000" ShadowArea="0.250000" AxisScl="0.040000" CameraOrbitDistance="0.500000" CameraOrbitAutoCenter="true" ShowStarfield="false">`,
            `    <LightAmbientColor R="33" G="33" B="33"/>`,
            `    <LightDiffuseColor R="229" G="229" B="229"/>`,
            `    <LightSpecularColor R="255" G="255" B="255"/>`,
            `    <LightSecondaryColor R="0" G="0" B="0"/>`,
            `    <LightTertiaryColor R="0" G="0" B="0"/>`,
            `    <BackgroundColor R="0" G="0" B="0"/>`,
            `    <GridColor R="180" G="180" B="220"/>`,
            `    <CageColor R="76" G="76" B="76"/>`,
            `    <CameraRotation e11="1.000000" e12="0.000000" e13="0.000000" e21="0.000000" e22="1.000000" e23="0.000000" e31="0.000000" e32="0.000000" e33="1.000000"/>`,
            `    <CameraPosition x="0.000000" y="1.000000" z="0.000000"/>`,
            `    <LightPosition x="0.000000" y="2.000000" z="5.000000"/>`,
            `  </Viewer3D>`,
            `</Settings>`
        ].join("\n");

        const scriptFileName = "_xnormal_" + uniqueId() + ".xml";
        const scriptFilePath = this.getFilePath(scriptFileName);
        return this.writeFile(scriptFilePath, scriptContent);
    }
}
