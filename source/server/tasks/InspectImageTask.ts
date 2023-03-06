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

import Job from "../app/Job";

import Task, { ITaskParameters } from "../app/Task";
import ToolTask from "../app/ToolTask";

////////////////////////////////////////////////////////////////////////////////

export interface IInspectImageTaskParameters extends ITaskParameters
{
}

export default class InspectImageTask extends ToolTask
{
    static readonly taskName = "InspectImage";

    static readonly description = "Image inspection task.";

    static readonly parameterSchema = {
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(InspectImageTask.parameterSchema);

    constructor(params: IInspectImageTaskParameters, context: Job)
    {
        super(params, context);

        // TODO: Set Tool
    }
}