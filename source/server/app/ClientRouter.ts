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
import * as http from "http";
import * as io from "socket.io";
import { Router } from "express";

import JobManager from "./JobManager";
import { IJobLogEvent } from "./Job";

////////////////////////////////////////////////////////////////////////////////

interface IConnectionEntry
{
    clientId: string;
    socket: io.Socket;
}

export default class ClientRouter
{
    public router: Router;

    protected jobManager: JobManager;
    protected realtimeServer: io.Server;
    protected connections: IConnectionEntry[];
    protected staticDir: string;


    constructor(jobManager: JobManager, httpServer: http.Server, staticDir: string)
    {
        this.onLogMessage = this.onLogMessage.bind(this);

        this.router = Router();
        this.jobManager = jobManager;

        this.realtimeServer = io.listen(httpServer);
        this.connections = [];
        this.staticDir = staticDir;

        this.setupRouter();
        this.setupRealtime();

        jobManager.on("log", this.onLogMessage);
    }

    protected setupRouter()
    {
        this.router.get("/", (req, res) => {
            res.sendFile(path.resolve(this.staticDir, "index.html"));
        });
    }

    protected setupRealtime()
    {
        const connections = this.connections;

        this.realtimeServer.on("connection", socket => {

            socket.on("hello", message => {
                const clientId = message;
                const index = connections.findIndex(conn => conn.socket === socket);
                if (index >= 0) {
                    connections.splice(index, 1);
                }
                connections.push({ socket, clientId });
            });

            socket.on("disconnect", () => {
                const index = connections.findIndex(conn => conn.socket === socket);
                if (index >= 0) {
                    connections.splice(index, 1);
                }
            });
        })
    }

    protected onLogMessage(event: IJobLogEvent)
    {
        // do not broadcast debug messages
        if (event.level === "debug") {
            return;
        }

        const connections = this.connections.filter(conn => conn.clientId === event.clientId);
        connections.forEach(conn => {
            conn.socket.emit("log", event);
        });
    }
}