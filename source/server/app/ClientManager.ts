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
import * as commentJSON from "comment-json";

////////////////////////////////////////////////////////////////////////////////

type ClientDict = { [id:string]: IClient };

export interface IClient
{
    name: string;
}

export default class ClientManager
{
    protected clients: ClientDict;

    constructor(clientFilePath: string)
    {
        this.clients = {};
        this.loadClients(clientFilePath);
    }

    hasClient(clientId: string): boolean
    {
        return this.clients[clientId] !== undefined;
    }

    protected loadClients(clientFilePath: string)
    {
        let jsonClients = "";

        try {
            jsonClients = fs.readFileSync(clientFilePath, "utf8");
        }
        catch (e) {
            throw new Error(`failed to read client file from ${clientFilePath}`);
        }

        this.clients = commentJSON.parse(jsonClients, null, true);

        if (!this.clients) {
            throw new Error("failed to parse client file");
        }

        console.log(`Clients loaded: ${Object.keys(this.clients).length}`);
    }
}
