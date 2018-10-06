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

import * as sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import * as path from "path";
process.env.NODE_PATH = path.resolve(__dirname, "../shared");
require("module").Module._initPaths();

import globals from "./app/globals";

import ExpressServer, { IExpressServerConfiguration } from "./app/ExpressServer";
import AssetServer from "./app/AssetServer";

import ApiRouter from "./app/ApiRouter";
import ClientRouter from "./app/ClientRouter";

import JobManager from "./app/JobManager";
import { ConfigurationError } from "./app/Errors";

////////////////////////////////////////////////////////////////////////////////
// GLOBAL SETTINGS

console.log("\n----------------------");
console.log("Cook Processing Server");
console.log("----------------------");

const expressServerConfig: IExpressServerConfiguration = {
    port: globals.serverPort,
    enableDevMode: globals.devMode,
    staticDir: globals.staticDir,
    sessionMaxAge: 10 * 365 * 24 * 60 * 60 * 1000, // ten years
    sessionSaveUninitialized: true,
    secret: "do3!knf(*&348kWEnksf#!"
};

////////////////////////////////////////////////////////////////////////////////

let jobManager;
try {
    jobManager = new JobManager(globals.rootDir, globals.workDir, globals.recipesDir);
}
catch (error) {
    if (error instanceof ConfigurationError) {
        console.error(`ConfigurationError: ${error.message}`);
        process.exit(1);
    }
    else {
        throw error;
    }
}

const expressApp = new ExpressServer(expressServerConfig);
expressApp.setup();

const clientRouter = new ClientRouter(jobManager, expressApp.server, globals.staticDir);
const assetServer = new AssetServer(globals.webDAVPort, globals.ftpPort, globals.workDir);
const apiRouter = new ApiRouter(jobManager, assetServer);


expressApp.use("/", clientRouter);
expressApp.use("/", apiRouter);
expressApp.use("/", assetServer);

//assetServer.start();
expressApp.start();
