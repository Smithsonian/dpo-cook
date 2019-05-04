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

export interface IPlayBake
{
    assets: { [id:string]: IPlayAsset },
    box: {
        name: string;
        description: string;
        tags: { [id:string]: string },
        mount: { [id:string]: string}
    }
}

export interface IPlayAsset
{
    name: string;
    size: number;
    type: string;
    files: { [id:string]: string }
}

export interface IPlayConfig
{

}

export interface IPlayPayloadInfo
{
    name: string;
    message: IPlayPayload
}

export interface IPlayPayload
{
    isCustomScene: boolean;
    boxId: string;
    pubName: string;
    pubUrl: string;
    pubThumb: string;
    pubPreview: string;
    tours: IPlayTour[];
    annotations: IPlayAnnotations[];
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
    "Stem.Color": number[];
    "index": number;
    "Opacity.Open": 1;
    "Opacity.Closed": 1;
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

}