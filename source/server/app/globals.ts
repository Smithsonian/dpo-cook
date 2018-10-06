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

import * as path from "path";

////////////////////////////////////////////////////////////////////////////////

export class Globals
{
    readonly rootDir: string;
    readonly staticDir: string;
    readonly recipesDir: string;

    readonly workDir: string;
    readonly currentDir: string;

    readonly toolsFilePath: string;
    readonly toolsDir: string;
    readonly tasksDir: string;

    readonly devMode: boolean;
    readonly serverPort: number;
    readonly webDAVPort: number;
    readonly ftpPort: number;

    constructor()
    {
        this.rootDir = path.resolve(__dirname, "../..");
        this.staticDir = path.resolve(this.rootDir, "static/");
        this.recipesDir = path.resolve(this.rootDir, "recipes/");

        this.workDir = path.resolve(this.rootDir, "work/");
        this.currentDir = process.cwd();

        this.toolsFilePath = path.resolve(this.rootDir, "tools.json");
        this.toolsDir = path.resolve(this.rootDir, "bin/server/tools/");
        this.tasksDir = path.resolve(this.rootDir, "bin/server/tasks/");

        this.devMode = process.env.NODE_ENV !== "production";
        this.serverPort = parseInt(process.env.SERVER_PORT) || 8000;
        this.webDAVPort = parseInt(process.env.WEBDAV_PORT) || 8001;
        this.ftpPort = parseInt(process.env.FTP_PORT) || 21;
    }
}

export default new Globals();