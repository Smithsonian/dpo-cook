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

import { Router } from "express";

import JobManager, { IJobOrder } from "./JobManager";
import AssetServer from "./AssetServer";

////////////////////////////////////////////////////////////////////////////////

export default class ApiRouter
{
    public router: Router;

    protected jobManager: JobManager;
    protected assetServer: AssetServer;


    constructor(jobManager: JobManager, assetServer: AssetServer)
    {
        this.router = Router();
        this.jobManager = jobManager;
        this.assetServer = assetServer;

        this.setupRouter();
    }

    private setupRouter()
    {
        const jobManager = this.jobManager;

        // submit a new job
        this.router.post("/job", (req, res) => {
            const jobOrder: IJobOrder = req.body;
            jobManager.createJob(jobOrder)
                .then(() =>
                    this.assetServer.grantAccess(jobOrder.id)
                )
                .then(() => {
                    res.status(201).json({});
                })
                .catch(error => {
                    console.log("\nError while processing POST", req.url);
                    console.error(error);
                    res.status(error.status || 500).json({ error: error.message });
                });
        });

        this.router.patch("/clients/:clientId/jobs/:jobId/run", (req, res) => {
            const clientId = req.params.clientId;
            const jobId = req.params.jobId;
            jobManager.runJob(clientId, jobId)
                .catch(error => {
                    console.log("\nError while processing PATCH", req.url);
                    console.error(error);
                });

            res.status(202).json({});
        });

        this.router.patch("/clients/:clientId/jobs/:jobId/cancel", (req, res) => {
            const clientId = req.params.clientId;
            const jobId = req.params.jobId;
            jobManager.cancelJob(clientId, jobId)
            .then(() => {
                res.json({});
            })
            .catch(error => {
                console.log("\nError while processing PATCH", req.url);
                console.error(error);
                res.status(error.status || 500).json({ error: error.message });
            });
        });

        // terminate and delete a job
        this.router.delete("/clients/:clientId/jobs/:jobId", (req, res) => {
            const clientId = req.params.clientId;
            const jobId = req.params.jobId;
            console.log("DELETE", req.url, "jobManager.removeJob");
            this.jobManager.removeJob(clientId, jobId)
                .then(() => {
                    console.log("DELETE", req.url, "assetServer.revokeAccess");
                    return this.assetServer.revokeAccess(jobId);
                })
                .then(() => {
                    res.json({});
                    console.log("DELETE", req.url, "response sent");
                })
                .catch(error => {
                    console.log("\nError while processing DELETE", req.url);
                    console.error(error);
                    res.status(error.status || 500).json({ error: error.message });
                });
        });

        // retrieve status information about all jobs
        this.router.get("/clients/:clientId/jobs", (req, res) => {
            const clientId = req.params.clientId;
            if (!clientId) {
                return res.status(500).json({ error: `invalid client id: ${clientId}`});
            }

            const jobInfos = jobManager.getJobInfoList(clientId);
            res.json(jobInfos);
        });

        // retrieve status information about the active job
        this.router.get("/clients/:clientId/jobs/:jobId", (req, res) => {
            const clientId = req.params.clientId;
            const jobId = req.params.jobId;
            const jobInfo = jobManager.getJobInfo(clientId, jobId);
            if (!jobInfo) {
                return res.status(400).json({ error: "unknown job id" });
            }

            res.json(jobInfo);
        });

        // retrieve a full report for the active and completed job
        this.router.get("/clients/:clientId/jobs/:jobId/report", (req, res) => {
            const clientId = req.params.clientId;
            const jobId = req.params.jobId;
            const jobReport = jobManager.getJobReport(clientId, jobId);
            if (!jobReport) {
                return res.status(400).json({ error: "unknown job id" });
            }

            res.json(jobReport);
        });

        // retrieve all available recipes on the machine
        this.router.get("/recipes", (req, res) => {
            const recipeInfos = jobManager.getRecipeInfoList();
            res.json(recipeInfos);
        });

        // retrieve information about a recipe
        this.router.get("/recipes/:id", (req, res) => {
            const recipe = jobManager.getRecipeByIdOrName(req.params.id);
            if (!recipe) {
                return res.status(400).json({ error: "unknown recipe name/id"});
            }
            return res.json(recipe);
        });

        // machine state
        this.router.get("/machine", (req, res) => {
            const state = jobManager.getState();
            res.set('Access-Control-Allow-Origin', '*');
            return res.json(state);
        })
    }
}