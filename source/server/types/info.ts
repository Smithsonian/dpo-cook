/**
 * 3D Foundation Project
 * Copyright 2018 Smithsonian Institution
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

import { Index, Dictionary } from "@ff/core/types";

////////////////////////////////////////////////////////////////////////////////

/**
 * Contains contextual information (articles, meta data) about a hierarchical entity (subject, item, model, etc.)
 */
export interface IInfo
{
    meta?: Dictionary<any>;
    process?: Dictionary<any>;
    articles?: IArticle[];
    leadArticle?: Index;
    notes?: INote[];
}

/**
 * Refers to an external document or a media file (audio, video, image).
 */
export interface IArticle
{
    id: string;
    uri: string;

    title?: string;
    lead?: string;
    tags?: string[];

    mimeType?: string;
    thumbnailUri?: string;
}

export interface INote
{
    date: string;
    user: string;
    text: string;
}