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

import * as React from "react";

import uniqueId from "@ff/core/uniqueId";
import Commander from "@ff/core/Commander";

import fetch from "@ff/browser/fetch";

import FlexContainer from "@ff/react/FlexContainer";
import FlexItem from "@ff/react/FlexItem";
import Label from "@ff/react/Label";
import LineEdit, { ILineEditBlurEvent } from "@ff/react/LineEdit";

import ComponentFactory from "@ff/react/ComponentFactory";
import DockView from "@ff/react/DockView";
import DockController, { IDockLayout } from "@ff/react/DockController";

import RecipeListView from "./RecipeListView";
import JobListView from "./JobListView";
import JobCreateView from "./JobCreateView";
import JsonDocumentView from "./JsonDocumentView";
import LogView from "./LogView";

import { IJobInfo, IJobReport, IMachineInfo, IRecipe, IRecipeInfo } from "common/types";

////////////////////////////////////////////////////////////////////////////////

/** Properties for [[ClientApplication]] component. */
export interface IClientApplicationProps
{
    reset?: boolean;
}

interface IClientApplicationState
{
    machineInfo: IMachineInfo;
    jobInfos: IJobInfo[];
    recipeInfos: IRecipeInfo[];
    clientId: string;
    jobId: string;
    report: IJobReport;
    recipe: IRecipe;
}

export default class ClientApplication extends React.Component<IClientApplicationProps, IClientApplicationState>
{
    static readonly defaultProps: Partial<IClientApplicationProps> = {
    };

    protected static readonly defaultLayout: IDockLayout = {
        type: "split",
        id: uniqueId(),
        size: 1,
        direction: "vertical",
        sections: [
            {
                type: "split",
                id: uniqueId(),
                size: 0.65,
                direction: "horizontal",
                sections: [
                    {
                        type: "stack",
                        id: uniqueId(),
                        size: 0.65,
                        activePaneId: "",
                        panes: [
                            {
                                id: uniqueId(),
                                title: "Create Job",
                                closable: false,
                                componentId: "create-job"
                            },
                            {
                                id: uniqueId(),
                                title: "Server Log",
                                closable: false,
                                componentId: "log"
                            }
                        ]
                    },
                    {
                        type: "stack",
                        id: uniqueId(),
                        size: 0.35,
                        activePaneId: "",
                        panes: [
                            {
                                id: uniqueId(),
                                title: "Job Info",
                                closable: false,
                                componentId: "job-details"
                            },
                            {
                                id: uniqueId(),
                                title: "Job Report",
                                closable: false,
                                componentId: "report-details"
                            },
                            {
                                id: uniqueId(),
                                title: "Recipe",
                                closable: false,
                                componentId: "recipe-details"
                            },
                            {
                                id: uniqueId(),
                                title: "Server Info",
                                closable: false,
                                componentId: "machine-info"
                            }
                        ]
                    }
                ]
            },
            {
                type: "stack",
                id: uniqueId(),
                size: 0.35,
                activePaneId: "",
                panes: [
                    {
                        id: uniqueId(),
                        title: "Jobs",
                        closable: false,
                        componentId: "job-list"
                    },
                    {
                        id: uniqueId(),
                        title: "Recipes",
                        closable: false,
                        componentId: "recipe-list"
                    }
                ]
            },
        ]
    };

    protected commander: Commander;
    protected dockableController: DockController;
    protected dockableFactory: ComponentFactory;
    protected localStorage: Storage;

    protected shortTimerHandle: number;
    protected longTimerHandle: number;

    constructor(props: IClientApplicationProps)
    {
        super(props);

        this.onShortTimer = this.onShortTimer.bind(this);
        this.onLongTimer = this.onLongTimer.bind(this);
        this.onSettingChange = this.onSettingChange.bind(this);
        this.onJobSelect = this.onJobSelect.bind(this);
        this.onJobRemove = this.onJobRemove.bind(this);
        this.onRecipeSelect = this.onRecipeSelect.bind(this);

        this.shortTimerHandle = -1;
        this.longTimerHandle = -1;
        this.localStorage = window ? window.localStorage : null;

        let clientId = "";
        let layout = ClientApplication.defaultLayout;

        if (!props.reset && this.localStorage) {
            clientId = this.localStorage.getItem("processing-client-id");
            const jsonLayout = this.localStorage.getItem("dockable-layout");
            layout = jsonLayout ? JSON.parse(jsonLayout) : layout;
        }

        this.commander = new Commander();
        this.dockableController = new DockController(this.commander, layout);

        if (this.localStorage) {
            this.dockableController.on("change", () => {
                window.localStorage.setItem("dockable-layout", JSON.stringify(this.dockableController.getLayout()));
            });
        }

        this.state = {
            machineInfo: null,
            jobInfos: [],
            recipeInfos: [],
            clientId,
            jobId: "",
            report: null,
            recipe: null
        };

        this.dockableFactory = new ComponentFactory([
            {
                id: "machine-info", factory: () =>
                    <JsonDocumentView
                        document={this.state.machineInfo} />
            },
            {
                id: "job-list", factory: () =>
                    <JobListView
                        clientId={this.state.clientId}
                        jobInfos={this.state.jobInfos}
                        selectedJobId={this.state.jobId}
                        onJobSelect={this.onJobSelect}
                        onJobRemove={this.onJobRemove} />
            },
            {
                id: "job-details", factory: () =>
                    <JsonDocumentView
                        document={this.getJobById(this.state.jobId)} />
            },
            {
                id: "create-job", factory: () =>
                     <JobCreateView
                        clientId={this.state.clientId}
                        recipe={this.state.recipe} />
            },
            {
                id: "recipe-list", factory: () =>
                     <RecipeListView
                        recipeInfos={this.state.recipeInfos}
                        selectedRecipeId={this.state.recipe ? this.state.recipe.id : ""}
                        onRecipeSelect={this.onRecipeSelect} />
            },
            {
                id: "report-details", factory: () =>
                    <JsonDocumentView
                        document={this.state.report} />
            },
            {
                id: "recipe-details", factory: () =>
                    <JsonDocumentView
                        document={this.state.recipe} />
            },
            {
                id: "log", factory: () =>
                    <LogView
                        clientId={this.state.clientId} />
            }
        ]);
    }

    componentDidMount()
    {
        this.fetchRecipeList();
        this.fetchJobList();

        this.shortTimerHandle = window.setInterval(this.onShortTimer, 2000);
        this.longTimerHandle = window.setInterval(this.onLongTimer, 4000);
    }

    componentWillUnmount()
    {
        window.clearInterval(this.shortTimerHandle);
        window.clearInterval(this.longTimerHandle);
    }

    render()
    {
        return (
            <FlexContainer
                direction="vertical"
                position="fill" >

                <FlexContainer
                    className="title-bar"
                    direction="horizontal"
                    shrink={0}
                    grow={0}
                    alignItems="center" >

                    <img className="logo" src="/static/images/cook-logo-250px.png"/>
                    <Label className="label byline">
                        Smithsonian 3D Foundation Project<br/>
                        Processing API Client Version 2018-10-06
                    </Label>
                    <FlexItem/>
                    <Label>Client ID</Label>
                    <LineEdit id="clientId" text={this.state.clientId} onBlur={this.onSettingChange}/>
                </FlexContainer>

                <FlexItem>
                    <DockView
                        controller={this.dockableController}
                        factory={this.dockableFactory} />
                </FlexItem>
            </FlexContainer>
        );
    }

    protected onShortTimer()
    {
        this.fetchJobInfo(this.state.jobId)
    }

    protected onLongTimer()
    {
        this.fetchJobList();
        this.fetchReport(this.state.jobId);
    }

    protected onSettingChange(event: ILineEditBlurEvent)
    {
        if (event.id === "clientId") {
            this.setState({ clientId: event.text });

            if (this.localStorage) {
                this.localStorage.setItem("processing-client-id", event.text);
            }
        }
    }

    protected onJobSelect(jobId: string)
    {
        this.setState({ jobId });
        this.fetchReport(jobId);
    }

    protected onJobRemove(id: string)
    {
        this.setState(prevState => {
            return {
                jobId: "",
                jobInfos: prevState.jobInfos.filter(jobInfo => jobInfo.id !== id)
            };
        });
    }

    protected onRecipeSelect(id: string)
    {
        this.fetchRecipe(id);
    }

    protected fetchJobInfo(jobId: string)
    {
        const clientId = this.state.clientId;
        if (!clientId && jobId) {
            this.setState({
                jobInfos: [],
                jobId: ""
            });
        }

        if (!clientId || !jobId) {
            return;
        }

        fetch.json(`/clients/${clientId}/jobs/${jobId}`, "GET")
        .then(result => {
            if (result.ok) {
                this.setState(prevState => {
                    const jobInfos = prevState.jobInfos;
                    const index = jobInfos.findIndex(jobInfo => jobInfo.id === jobId);
                    if (index >= 0) {
                        jobInfos[index] = result.json;
                    }
                    return { jobInfos };
                });
            }
        });
    }

    protected fetchJobList()
    {
        const clientId = this.state.clientId;
        if (!clientId) {
            return;
        }

        fetch.json(`/clients/${clientId}/jobs`, "GET")
        .then(result => {
            if (result.ok) {
                this.setState(prevState => {
                    // if no job is selected, select first job
                    const firstJob = result.json[0];
                    return {
                        jobInfos: result.json,
                        jobId: prevState.jobId || (firstJob ? firstJob.id : "")
                    };
                });
            }
        });
    }

    protected fetchReport(jobId: string)
    {
        const clientId = this.state.clientId;
        if (!clientId || !jobId) {
            return;
        }

        fetch.json(`/clients/${clientId}/jobs/${jobId}/report`, "GET")
        .then(result => {
            if (result.ok) {
                this.setState({ report: result.json });
            }
        });
    }

    protected fetchRecipeList()
    {
        fetch.json("/recipes", "GET")
        .then(result => {
            if (result.ok) {
                this.setState({ recipeInfos: result.json });
                const firstRecipe = result.json[0];
                if (!this.state.recipe && firstRecipe) {
                    this.fetchRecipe(firstRecipe.id);
                }
            }
        });
    }

    protected fetchRecipe(recipeId: string)
    {
        fetch.json(`recipes/${recipeId}`, "GET")
        .then(result => {
            if (result.ok) {
                this.setState({ recipe: result.json });
            }
        });
    }

    protected fetchMachineState()
    {
        fetch.json("/machine", "GET")
            .then(result => {
                if (result.ok) {
                    this.setState({ machineInfo: result.json });
                }
            })
    }

    protected getJobById(id: string): IJobInfo
    {
        for (let jobInfo of this.state.jobInfos) {
            if (jobInfo.id === id) {
                return jobInfo;
            }
        }

        return null;
    }
}