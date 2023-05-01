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

import * as fetch from "node-fetch";

////////////////////////////////////////////////////////////////////////////////

type Method = "get" | "put" | "patch"| "post" | "delete" | "GET" | "PUT" | "PATCH" | "POST" | "DELETE";

export default {
    json: async function(url: string, method: Method, data?: string | {}): Promise<any> {

        if (data && typeof data !== "string") {
            data = JSON.stringify(data);
        }

        const params: any = {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            method: method,
            credentials: "include",
            body: data
        };

        return fetch(url, params).then(result => {
            if (!result.ok) {
                const message = `fetch.json (${method} at '${url}'), error: ${result.status} - ${result.statusText}`;
                console.warn(message);
                throw new Error(message);
            }

            return result.json();

        }).catch(error => {
            console.warn(`fetch.json (${method} at '${url}'), error: ${error.message}`);
            throw error;
        });
    },

    text: async function(url: string, method: Method, data?: string): Promise<string> {

        const params: any = {
            headers: {
                "Accept": "text/plain",
                "Content-Type": "text/plain",
            },
            method: method,
            credentials: "include",
            body: data
        };

        return fetch(url, params).then(result => {
            if (!result.ok) {
                const message = `fetch.text (${method} at '${url}'), error: ${result.status} - ${result.statusText}`;
                console.warn(message);
                throw new Error(message);
            }

            return result.text();

        }).catch(error => {
            console.warn(`fetch.text (${method} at '${url}'), error: ${error.message}`);
            throw error;
        });
    },

    file: async function(url: string, method: Method, file: File, detectType: boolean = true): Promise<any> {

        const params: any = {
            method,
            credentials: "include",
            body: file
        };

        if (!detectType) {
            params.headers = {
                "Content-Type": "application/octet-stream"
            };
        }

        return fetch(url, params).then(result => {
            if (!result.ok) {
                const message = `fetch.file (${method} at '${url}'), error: ${result.status} - ${result.statusText}`;
                console.warn(message);
                throw new Error(message);
            }

            return result;

        }).catch(error => {
            console.warn(`fetch.file (${method} at '${url}'), error: ${error.message}`);
            throw error;
        });
    },

    buffer: async function(url: string, method: Method, buffer?: ArrayBuffer): Promise<ArrayBuffer> {

        const params: any = {
            headers: {
                "Accept": "application/octet-stream",
                "Content-Type": "application/octet-stream"
            },
            method,
            credentials: "include",
            body: buffer
        };

        return fetch(url, params).then(result => {
            if (!result.ok) {
                const message = `fetch.buffer (${method} at '${url}'), error: ${result.status} - ${result.statusText}`;
                console.warn(message);
                throw new Error(message);
            }

            return result.buffer();

        }).catch(error => {
            console.warn(`fetch.buffer (${method} at '${url}'), error: ${error.message}`);
            throw error;
        });
    }
};