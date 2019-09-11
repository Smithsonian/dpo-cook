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

import { Dictionary } from "@ff/core/types";

////////////////////////////////////////////////////////////////////////////////

export interface IPlayContext
{
    drupalBaseUrl: string;
    payloadBaseUrl: string;
    cdnBaseUrl: string;
    baseDir: string;
    assetDir: string;
    articleDir: string;
    files: Dictionary<string>;
}

export interface IPlayBoxInfo
{
    id: string;
    bake: IPlayBake;
    config: IPlayConfig;
    descriptor: IPlayDescriptor;
    payload: IPlayPayload;
}

export interface IPlayBake
{
    box: {
        name: string;
        description: string;
        tags: Dictionary<string>,
        mount: Dictionary<string>
    },
    assets: Dictionary<IPlayAsset>
}

export interface IPlayAsset
{
    name: string;
    size: number;
    type: string;
    files: Dictionary<string>
}

export interface IPlayDescriptor
{
    name: string;
    units: string;
    transform: number[];
    parts: IPlayPart[];
}

export interface IPlayPart
{
    name: string;
    files: {
        mesh: string;
        diffuse?: string;
        normal?: string;
        occlusion?: string;
    }
}

export interface IPlayConfig
{
    "Material - Curator Settings": any;
    "Background - Curator Settings": any;
    "Grid - Curator Settings": any;
    "Measure - Curator Settings": any;
    "Lighting - Curator Settings": any;
    "Curator Tools": any;
    "Viewcube and Grid for thumbnail": any;
    "Title - Curator Settings": any;
    "Annotation - Curator Settings": any;
    "Camera - Curator Settings": any;
    "Model Rotation - Curator Settings": any;

    "Sidebar": { URL: string };
    "Default Sidebar": { URL: string };
    "Curator Sidebar": { URL: string };
}

export interface IPlayPayload
{
    name: string;
    message: {
        isCustomScene: boolean;
        boxId: string;
        pubName: string;
        pubUrl: string;
        pubThumb: string;
        pubPreview: string;
        tours: IPlayTour[];
        annotations: IPlayAnnotations[];
    }
}

export interface IPlayAnnotations
{
    name: string;
    description: string;
    annotations: IPlayAnnotation[]
}

export interface IPlayAnnotation
{
    "Transform.Position": number[];
    "Transform.Rotation": number[];
    "Title": string;
    "Body": string;
    "Link": string;
    "labels": string;
    "Stem.On": boolean;
    "Stem.Length": number;
    "Stem.Width": number;
    "Stem.Rot.X": number;
    "Stem.Rot.Y": number;
    "Stem.Color": number[]; // RGB float
    "index": number;
    "Opacity.Open": number;
    "Opacity.Closed": number;
    "Fade": boolean;
    "Fade.Near": number;
    "Fade.Far": number;
    "TextSize.Header": number;
    "TextSize.Body": number;
    "TextSize.Link": number;
    "Annotation.Width": number;
}

export interface IPlayTour
{
    name: string;
    description: string;
    snapshots: IPlaySnapshot[];
}

export interface IPlaySnapshot
{
    name: string;
    data: IPlaySnapshotData;
    transition: {
        duration: number;
        switch: number;
        curve: number;
    }
}

export interface IPlaySnapshotData
{
    "Material Store": {
        "Material.Roughness": number;
        "Material.Metalness": number;
        "Material.Exposure": number;
        "Material.Gamma": number;
        "Material.Occlusion": number;
        "Material.Regular.Opacity": number;
        "Material.Wireframe.Opacity": number;
        "Material.X-ray.Opacity": number;
        "Material.Regular.Color": number[];
        "Material.Wireframe.Color": number[];
        "Material.X-ray.Color": number[];
        "Material.PhotoTexture": number;
        "Material.Menu": number;
    };
    "Lighting Store": {
        "Environment.Preset": number;
        "Lighting.Pointlight.On": boolean;
        "Lighting.Pointlight.Manip.On": boolean;
        "Lighting.Environment.Exposure": number;
        "Lighting.Pointlight.Position": number[];
        "Lighting.Pointlight.Intensity": number;
        "Lighting.Pointlight.Color": number[];
    };
    "Background Store": {
        "Background.Menu": number;
        "Background.Top.Color": number[];
        "Background.Bottom.Color": number[];
    };
    "Grid Store": {
        "Grid.On": boolean;
        "Grid.Units": number;
        "Grid.Menu": number;
        "Grid.Single.Menu": number;
        "Grid.Single.On": boolean;
        "Grid.Triple.On": boolean;
        "Grid.Size": string;
        "Grid.Opacity": number;
        "Grid.Primary.Color": number[];
        "Grid.Secondary.Color": number[];
    };
    "Camera Store": {
        "WhichCam": number;
        "WhichOrientation": number;
        "Camera.Orientation": number[]; // Vector 3
        "Camera.Offset": number[];      // Vector 3
        "Camera.Center": number[];      // Vector 3
        "Camera.Distance": number,
        "Camera.Transform": number[];   // Matrix 4
        "Camera.FOV": number;           // Degrees
        "Camera.Orthographic": boolean;
    };
    "Measure Store": {
        "Measure.Thumbtack.On": boolean;
        "Measure.On": boolean;
        "Measure.Units": number;
        "Measure.Distance": number;
        "Measure.Point0.Position": number[];  // Vector 3
        "Measure.Point0.Rotation": number[];  // Vector 3
        "Measure.Point0.Scale": number[];     // Vector 3
        "Measure.Point1.Position": number[];  // Vector 3
        "Measure.Point1.Rotation": number[];  // Vector 3
        "Measure.Point1.Scale": number[];     // Vector 3
        "Measure.Line.Position": number[];    // Vector 3
        "Measure.Line.Rotation": number[];    // Vector 3
        "Measure.Line.Scale": number[];       // Vector 3
        "Measure.Point0.Transform": number[]; // Matrix 4
        "Measure.Point1.Transform": number[]; // Matrix 4
        "Measure.Line.Transform": number[];   // Matrix 4
    };
    "Annotation Label Store": {
        "Annotation.VisibleLabels": string;
    };
    "Layout Store": {
        "Layout.DoubleView.On": boolean;
        "Layout.Menu": number;
        "Layout.Merge.On": boolean;
    };
    "Ortho Store": {
        "Ortho.F.On": boolean;
        "Ortho.R.On": boolean;
        "Ortho.BK.On": boolean;
        "Ortho.L.On": boolean;
        "Ortho.T.On": boolean;
        "Ortho.BM.On": boolean;
    };
    "Annotation Store": {
        "Annotation.On": boolean;
        "Annotation.OneLabel": boolean;
        "Annotation.WhichOpen": number; // ID?
    };
    "Sidebar Store": {
        "Sidebar.On": boolean;
        "Sidebar.URL": string;
    };
    "Section Store": {
        "Section.Manip.Position": number[]; // Vector 3
        "Section.Manip.Rotation": number[]; // Vector 3
        "Section.CutPlane.Position": number[]; // Vector 3
        "Section.CutPlane.Rotation": number[]; // Vector 3
        "Section.On": boolean;
        "Section.Manip.On": boolean;
    };
    "COR Store": {
        "COR.On": boolean;
        "COR.Position": number[]; // Vector 3
    };
    "Model Space Store": {
        "ModelSpace.Position": number[]; // Vector 3
        "ModelSpace.Rotation": number[]; // Vector 3
        "ModelSpace.Scale": number[]; // Vector 3
        "ModelSpace.Transform": number[]; // Matrix 4
        "ModelSpace.Units": string; // "millimeter"
    };

    "Background Button Store": {};
    "Sidebar Button Store": {};
    "Annotation Button Store": {};
    "Material Button Store": {};
    "Grid Button Store": {};
    "Lighting Button Store": {};
    "Layout Button Store": {};
    "Measure Button Store": {};
    "Ortho Button Store": {};
}