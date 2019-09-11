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

import uniqueId from "@ff/core/uniqueId";

import { IAnnotation } from "../types/model";
import { IPlayAnnotation } from "./playTypes";

////////////////////////////////////////////////////////////////////////////////

export function convertAnnotation(annotation: IPlayAnnotation, articleId?: string): IAnnotation
{
    const result: IAnnotation = {
        id: uniqueId(),
        title: annotation.Title,
        lead: annotation.Body,

        style: annotation.Body || articleId ? "Extended" : "Default",
        visible: false,

        position: [],
        direction: [],
        color: [],
        scale: 1,
        offset: 0,
    };

    if (articleId) {
        result.articleId = articleId;
    }

    return result;
}