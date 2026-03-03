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
import * as fs from "fs";
import Tool, { IToolMessageEvent, IToolSettings, IToolSetup, ToolInstance } from "../app/Tool";

export interface IRealityCaptureToolSettings extends IToolSettings
{
    imageInputFolder: string;
    alignImageFolder?: string;
	maskImageFolder?: string;
    outputFile?: string;
    scalebarFile?: string;
    meshQuality?: string;
    //depthMapQuality?: string;
    keypointLimit?: number;
    customFaceCount?: number;
    optimizeMarkers?: boolean;
    camerasFile?: string;
    doReconstruct?: boolean;
}

////////////////////////////////////////////////////////////////////////////////

export type RealityCaptureInstance = ToolInstance<RealityCaptureTool, IRealityCaptureToolSettings>;

export default class RealityCaptureTool extends Tool<RealityCaptureTool, IRealityCaptureToolSettings>
{
    static readonly toolName = "RealityScan";

    protected static readonly defaultOptions: Partial<IRealityCaptureToolSettings> = {};

    async setupInstance(instance: RealityCaptureInstance): Promise<IToolSetup>
    {
        const settings = instance.settings;
        const inputFolder = path.parse(settings.imageInputFolder).name;
        const name = path.parse(settings.outputFile).name;
        const quality = settings.meshQuality === "Low" ? "Preview" : settings.meshQuality === "Medium" ? "Normal" : "High";
        const faceCount = settings.meshQuality === "Custom" && settings.customFaceCount != undefined ? `-simplify ${settings.customFaceCount}` : ``;

        const inputImageFolder = instance.getFilePath(inputFolder);
        if (!inputImageFolder) {
            throw new Error("RealityCaptureTool: missing image folder name");
        }

        const outputDirectory = instance.workDir;

        let operations = "";
        operations += ` -headless -disableOnlineCommunication -set appQuitOnError=true -set appIncSubdirs=true -stdConsole -newScene -addFolder "${inputImageFolder}"`;

        if(settings.alignImageFolder) {
            const alignImageFolder = instance.getFilePath(path.parse(settings.alignImageFolder).name);
            operations += ` -addFolder "${alignImageFolder}" -selectImage "${alignImageFolder}\\*.*" -enableMeshing false -enableTexturingAndColoring false`;
        }

        if(settings.maskImageFolder) {
            const maskImageFolder = instance.getFilePath(path.parse(settings.maskImageFolder).name);

            const masks = fs.readdirSync(maskImageFolder);

            if(masks.length < 10) {
                masks.forEach( (mask) => {
                    const filename = path.basename(mask);
                    const tokenized = filename.split("-");
                    const delimeter = tokenized[tokenized.length-2]
                
                    operations += ` -selectImage "${inputImageFolder}\\*${delimeter}*.*" -setImagesLayer "${maskImageFolder}\\${mask}" mask `;
                });
            }
            else {
                const newPath = inputImageFolder+"\\_mask!Masks";
                fs.renameSync(maskImageFolder, newPath);
                operations += ` -addFolder "${newPath}" `;
            }
        }

        // add scaling info
        if(settings.scalebarFile) {
            operations += ` -detectMarkers`;

            const sbFile: string = await instance.readFile(settings.scalebarFile).then(data => { return data as string })
            .catch( err => { throw new Error(`Error reading scalebar file. ${err}`) });

            const scalebars = sbFile.split(/\r?\n/);
            scalebars.forEach((line, idx) => {
                if(/^\d/.test(line)) { // only parse lines that start with a number
                    const values = line.split(",");
                    if(values.length === 3) {
                        operations += ` -defineDistance ${this.convertMarkerCode(parseInt(values[0]))} ${this.convertMarkerCode(parseInt(values[1]))} ${values[2]} scalebar${idx}`;
                    }
                }
            });
        }

        operations += ` -silent "${outputDirectory}" -set sfmMaxFeaturesPerImage=${settings.keypointLimit} -align ${settings.optimizeMarkers ? "-align" : ""}`
        
        if(settings.camerasFile) {
            operations += ` -exportRegistration "${outputDirectory}\\${settings.camerasFile}.csv" "${outputDirectory}\\_reg_params.xml" -exportSparsePointCloud "${outputDirectory}\\${settings.camerasFile}-points.ply" "${outputDirectory}\\_points_params.xml"`;
        }

        operations += ` -save "${outputDirectory}\\${name}-align.rcproj"`;

        if(settings.doReconstruct) {
            operations += ` -selectMaximalComponent -setReconstructionRegionAuto ${quality == "High" ? "-calculateHighModel" : quality == "Normal" ? "-calculateNormalModel" : "-calculatePreviewModel"} ${faceCount} -save "${outputDirectory}\\${name}-mesh.rcproj"`;
            operations += ` -selectMarginalTriangles -removeSelectedTriangles -selectLargestModelComponent -invertTrianglesSelection -removeSelectedTriangles -cleanModel`;
            operations += ` -renameSelectedModel "${name}_model" -calculateTexture -save "${outputDirectory}\\${name}-raw_clean.rcproj" -exportModel "${name}_model" "${outputDirectory}\\${name}.obj" "${outputDirectory}\\_rc_params.xml"`;
        }

        operations += ` -quit`;

        const configFiles = [];

        const command = `"${this.configuration.executable}" ${operations}`;

        if(settings.doReconstruct) {
            // set export parameters via params.xml file
            const content = [`<ModelExport exportBinary="1" exportInfoFile="1" exportVertices="1" exportVertexColors="2"`,
            `exportVertexNormals="0" exportTriangles="1" exportTriangleStrips="0"`,
            `meshColor="4294967295" tileType="0" exportTextureAlpha="0" exportToOneTexture="0"`,
            `embedTextures="0" shrinkTextures="0" oneTextureMaxSide="8192" oneTextureUsePow2TexSide="1"`,
            `exportCoordinateSystemType="0" settingsAnchor="0 0 0" settingsRotation="0 0 0"`,
            `settingsScalex="1" settingsScaley="1" settingsScalez="1" normalSpace="2"`,
            `normalRange="0" normalFlip="0 0 0" formatAndVersionUID="obj 000 "`,
            `exportModelByParts="0" exportRandomPartColor="0" exportCameras="0"`,
            `exportCamerasAsModelPart="0" exportMaterials="1" numberAsciiFormatting="5"`,
            `authorComment="" exportedLayerCount="1">`,
            `<Header magic="5786949" version="5"/>`,
            `<Layer0 type="1" textureLayerIndex="0" textureWicContainerFormat="{1B7CFAF4-713F-473C-BBCD-6137425FAEAF}"`,
            `  textureWicPixelFormat="{6FDDC324-4E03-4BFE-B185-3D77768DC90F}" textureExtension="png"/>`,
            `</ModelExport>`].join("\n");

            const paramFileName = "_rc_params.xml";

            configFiles.push(instance.writeFile(paramFileName, content));
        }

        if(settings.camerasFile) {
            // set export parameters via params.xml file
            const regContent = [`<Configuration id="{2D5793BC-A65D-4318-A1B9-A05044608385}">
            <entry key="calexTrans" value="1"/>
            <entry key="calexHasDisabled" value="0x0"/>
            <entry key="MvsExportScaleZ" value="1.0"/>
            <entry key="MvsExportIsGeoreferenced" value="0x0"/>
            <entry key="MvsExportIsModelCoordinates" value="0"/>
            <entry key="MvsExportScaleY" value="1.0"/>
            <entry key="MvsExportScaleX" value="1.0"/>
            <entry key="MvsExportRotationY" value="0.0"/>
            <entry key="MvsExportcoordinatesystemtype" value="0"/>
            <entry key="MvsExportNormalFlipZ" value="false"/>
            <entry key="MvsExportRotationX" value="0.0"/>
            <entry key="hasCalexFilePath" value="1"/>
            <entry key="MvsExportNormalFlipY" value="false"/>
            <entry key="MvsExportNormalSpace" value="Mikktspace"/>
            <entry key="calexHasUndistort" value="-1"/>
            <entry key="MvsExportNormalFlipX" value="false"/>
            <entry key="MvsExportRotationZ" value="0.0"/>
            <entry key="calexFileFormat" value="Internal/External camera parameters"/>
            <entry key="MvsExportMoveZ" value="0.0"/>
            <entry key="calexFileFormatId" value="{0CA18733-1EBC-4254-9974-17197EB409BD}"/>
            <entry key="hasRadianceFieldsTransAABB" value="0"/>
            <entry key="hasCalexFileName" value="1"/>
            <entry key="calexHasImageExport" value="-1"/>
            <entry key="MvsExportMoveX" value="0.0"/>
            <entry key="MvsExportNormalRange" value="ZeroToOne"/>
            <entry key="MvsExportMoveY" value="0.0"/>
            </Configuration>`].join("\n");

            const regFileName = "_reg_params.xml";

            configFiles.push(instance.writeFile(regFileName, regContent));

            // set export parameters via params.xml file
            const pointsContent = [`<Configuration id="{2D5793BC-A65D-4318-A1B9-A05044608385}">
            <entry key="calexTrans" value="1"/>
            <entry key="bAscii" value="false"/>
            <entry key="calexHasDisabled" value="0x0"/>
            <entry key="bVertexColor" value="true"/>
            <entry key="MvsExportScaleZ" value="1.0"/>
            <entry key="MvsExportIsGeoreferenced" value="0x0"/>
            <entry key="MvsExportIsModelCoordinates" value="0"/>
            <entry key="MvsExportScaleY" value="1.0"/>
            <entry key="MvsExportScaleX" value="1.0"/>
            <entry key="MvsExportRotationY" value="0.0"/>
            <entry key="MvsExportcoordinatesystemtype" value="0"/>
            <entry key="MvsExportNormalFlipZ" value="false"/>
            <entry key="MvsExportRotationX" value="0.0"/>
            <entry key="hasCalexFilePath" value="1"/>
            <entry key="MvsExportNormalFlipY" value="false"/>
            <entry key="MvsExportNormalSpace" value="Mikktspace"/>
            <entry key="calexHasUndistort" value="-1"/>
            <entry key="MvsExportNormalFlipX" value="false"/>
            <entry key="MvsExportRotationZ" value="0.0"/>
            <entry key="calexFileFormat" value="Sparse point cloud as Polygon File Format (*.ply)"/>
            <entry key="MvsExportMoveZ" value="0.0"/>
            <entry key="calexFileFormatId" value="{B63136B7-2E64-4D08-B5B1-A945F1AED679}"/>
            <entry key="hasRadianceFieldsTransAABB" value="0"/>
            <entry key="hasCalexFileName" value="1"/>
            <entry key="calexHasImageExport" value="-1"/>
            <entry key="MvsExportMoveX" value="0.0"/>
            <entry key="MvsExportNormalRange" value="ZeroToOne"/>
            <entry key="MvsExportMoveY" value="0.0"/>
          </Configuration>`].join("\n");

            const pointsFileName = "_points_params.xml";

            configFiles.push(instance.writeFile(pointsFileName, pointsContent));
        }


        return Promise.all(configFiles).then(() => ({
            command
        }));
    }

    // Converts from Metashape numbering to RC naming style
    private convertMarkerCode(code: number) : string {
        let returnCode = "0";

        if(code < 16) {
            returnCode = (code + 16).toString(16);
        }
        else if(code < 39) {
            returnCode = (code + 17).toString(16);
        }
        else if(code < 46) {
            returnCode = (code + 18).toString(16);
        }
        else if(code < 54) {
            returnCode = (code + 22).toString(16);
        }
        else if(code < 57) {
            returnCode = (code + 23).toString(16);
        }
        else if(code < 60) {
            returnCode = (code + 24).toString(16);
        }
        else if(code < 63) {
            returnCode = (code + 25).toString(16);
        }
        else if(code < 70) {
            returnCode = (code + 26).toString(16);
        }
        else if(code < 71) {
            returnCode = (code + 29).toString(16);
        }
        else if(code < 74) {
            returnCode = (code + 30).toString(16);
        }
        else if(code < 81) {
            returnCode = (code + 31).toString(16);
        }
        else if(code < 88) {
            returnCode = (code + 32).toString(16);
        }
        else if(code < 91) {
            returnCode = (code + 33).toString(16);
        }
        else if(code < 94) {
            returnCode = (code + 34).toString(16);
        }
        else if(code < 96) {
            returnCode = (code + 52).toString(16);
        }
        else if(code < 99) {
            returnCode = (code + 53).toString(16);
        }
        else if(code < 104) {
            returnCode = (code + 54).toString(16);
        }
        else {
            // throw error?
        }

        while (returnCode.length < 3) {
            returnCode = "0" + returnCode;
        }

        return "1x12:"+returnCode;
    }
}