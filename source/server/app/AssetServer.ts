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

import { Router } from "express";

import * as path from "path";
import { v2 as webdav } from "webdav-server";

////////////////////////////////////////////////////////////////////////////////

export default class AssetServer
{
    public router: Router;

    protected webDAVServer: webdav.WebDAVServer;
    protected activeJobs: { [id:string]: any };
    protected workDir: string;

    constructor(dirs: { work: string })
    {
        this.router = Router();

        this.webDAVServer = new webdav.WebDAVServer(/* { port: webDAVPort } */);

        this.webDAVServer.afterRequest((req, next) => {
            // Display the method, the URI, the returned status code and the returned message
            console.log(`WEBDAV ${req.request.method} ${req.request.url} ` +
                `${req.response.statusCode} ${req.response.statusMessage}`);
            next();
        });

        this.activeJobs = {};
        this.workDir = dirs.work;

        this.setupRouter();
    }

    private setupRouter()
    {
        this.router.use(webdav.extensions.express("/", this.webDAVServer));
    }

    // start(): Promise<void>
    // {
    //     return new Promise((resolve, reject) => {
    //         this.webDAVServer.start(() => {
    //             console.log(`WebDAV server listening on port ${this.webDAVServer.options.port}`);
    //             resolve();
    //         });
    //     });
    // }

    grantAccess(jobId: string): Promise<void>
    {
        return new Promise((resolve, reject) => {
            if (this.activeJobs[jobId]) {
                return reject(new Error(`file access already granted for job '${jobId}'`));
            }

            this.activeJobs[jobId] = true;

            const physicalPath = path.resolve(this.workDir, jobId);
            this.webDAVServer.setFileSystem("/" + jobId, new webdav.PhysicalFileSystem(physicalPath), success => {
                if (!success) {
                    return reject(new Error(`failed to mount WebDAV file system at '${physicalPath}'`));
                }

                return resolve();
            });
        });
    }

    revokeAccess(jobId: string): Promise<void>
    {
        return new Promise((resolve, reject) => {
            if (!this.activeJobs[jobId]) {
                return reject(new Error(`unknown job id '${jobId}'`));
            }

            delete this.activeJobs[jobId];

            this.webDAVServer.removeFileSystem("/" + jobId, removeCount => {
                if (!removeCount) {
                    return reject(new Error(`failed to unmount WebDAV file system`));
                }

                return resolve();
            });
        });
    }
}