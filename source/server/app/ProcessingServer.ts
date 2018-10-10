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

import * as fs from "fs";
import * as path from "path";

import * as jsonLoader from "../utils/jsonLoader";

import ExpressServer from "./ExpressServer";
import JobManager from "./JobManager";
import ClientRouter from "./ClientRouter";
import ApiRouter from "./ApiRouter";
import AssetServer from "./AssetServer";

import { ConfigurationError } from "./Errors";

////////////////////////////////////////////////////////////////////////////////

export default class ProcessingServer
{
    protected baseDir: string;

    protected server: ExpressServer;
    protected apiRouter: ApiRouter;
    protected clientRouter: ClientRouter;
    protected jobManager: JobManager;
    protected assetServer: AssetServer;

    constructor(baseDir: string)
    {
        this.baseDir = baseDir;

        const schemaDir = path.resolve(baseDir, "schemas/");
        const configSchemaPath = path.resolve(schemaDir, "server.schema.json");
        const configFilePath = path.resolve(baseDir, "server.json");
        const config = jsonLoader.validate<any>(configFilePath, configSchemaPath, true);


        const { work, recipes, files, tools, tasks } = config.directories;
        const ports = config.ports;

        const dirs = {
            base: baseDir,
            schemas: schemaDir,
            work: path.resolve(baseDir, work),
            recipes: path.resolve(baseDir, recipes),
            files: path.resolve(baseDir, files),
            tools: path.resolve(baseDir, tools),
            tasks: path.resolve(baseDir, tasks)
        };

        this.server = new ExpressServer({
            port: ports.server,
            enableDevMode: false,
            enableLogging: true,
            staticRoute: "/static",
            staticDir: dirs.files,
            sessionMaxAge: 15 * 24 * 3600000, // 2 weeks
            sessionSaveUninitialized: true
        });

        this.server.setup();

        this.jobManager = new JobManager(dirs);
        this.assetServer = new AssetServer(dirs);
        this.apiRouter = new ApiRouter(this.jobManager, this.assetServer);
        this.clientRouter = new ClientRouter(this.jobManager, this.server.server, dirs);

        this.server.app.use("/", this.clientRouter.router);
        this.server.app.use("/", this.apiRouter.router);
        this.server.app.use("/", this.assetServer.router);
    }

    start()
    {
        this.server.start();
    }
}