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

import * as React from "react";

import uuid from "@ff/core/uuid";
import fetch from "@ff/browser/fetch";

import FlexContainer from "@ff/react/FlexContainer";
import FlexItem from "@ff/react/FlexItem";

import Label from "@ff/react/Label";
import Badge from "@ff/react/Badge";
import BusyBox from "@ff/react/BusyBox";
import Checkbox from "@ff/react/Checkbox";
import LineEdit, { ILineEditBlurEvent } from "@ff/react/LineEdit";
import Button, { IButtonTapEvent } from "@ff/react/Button";
import Overlay from "@ff/react/Overlay";
import FileDropTarget from "@ff/react/FileDropTarget";

import { IRecipe, IJobOrder } from "common/types";

////////////////////////////////////////////////////////////////////////////////

/** Properties for [[CreateJobView]] component. */
export interface IJobCreateViewProps
{
    className?: string;
    clientId: string;
    recipe: IRecipe;
}

interface IJobCreateViewState
{
    recipe: IRecipe;
    jobOrder: IJobOrder;
    filesToUpload: { [param:string]: File };
    isEdited: boolean;
    isUploading: boolean;
    isAdvancedActive: boolean;
}

export default class JobCreateView extends React.Component<IJobCreateViewProps, IJobCreateViewState>
{
    static defaultProps: Partial<IJobCreateViewProps> = {
        className: "sc-create-job-view"
    };

    static getDerivedStateFromProps(props: IJobCreateViewProps, state: IJobCreateViewState)
    {
        if (props.clientId && props.recipe && !state.isEdited) {
            return {
                recipe: props.recipe,
                jobOrder: JobCreateView.createJobOrder(props.clientId, props.recipe, state.jobOrder),
                filesToUpload: {},
                isEdited: false
            };
        }

        return state;
    }

    static createJobOrder(clientId: string, recipe: IRecipe, jobOrder?: IJobOrder): IJobOrder
    {
        return {
            id: jobOrder ? jobOrder.id : uuid(),
            name: "unnamed",
            clientId: clientId,
            recipeId: recipe.id,
            priority: "normal",
            submission: "",
            parameters: {}
        };
    }

    constructor(props: IJobCreateViewProps)
    {
        super(props);

        this.onSettingChange = this.onSettingChange.bind(this);
        this.onParamChange = this.onParamChange.bind(this);
        this.onDropFiles = this.onDropFiles.bind(this);
        this.onTapReset = this.onTapReset.bind(this);
        this.onTapCreate = this.onTapCreate.bind(this);
        this.onTapUpload = this.onTapUpload.bind(this);
        this.onTapAdvanced = this.onTapAdvanced.bind(this);

        this.state = {
            recipe: null,
            jobOrder: null,
            filesToUpload: null,
            isEdited: false,
            isUploading: false,
            isAdvancedActive: false
        };
    }

    render()
    {
        const jobOrder = this.state.jobOrder;
        const edited = this.state.isEdited;
        const advanced = this.state.isAdvancedActive;

        if (!jobOrder) {
            return null;
        }

        const recipe = this.state.recipe;
        const schema = recipe.parameterSchema as any;
        const schemaProps = schema.properties;
        const sortedProps = Object.keys(schemaProps).map((name, index) => ({ name, index }));
        const requiredProps = schema.required;
        if (requiredProps && requiredProps.length > 0) {
            sortedProps.sort((a, b) => {
                const aReq = requiredProps.indexOf(a.name) > -1;
                const bReq = requiredProps.indexOf(b.name) > -1;
                if (aReq && !bReq) return -1;
                if (!aReq && bReq) return 1;
                if (a.index < b.index) return -1;
                if (a.index > b.index) return 1;
                return 0;
            });
        }
        const advancedProps = schema.advanced;

        const tableRows = sortedProps.map(prop => {

            const name = prop.name;
            const isRequired = requiredProps && requiredProps.indexOf(name) > -1;
            const isFile = schemaProps[name].format === "file";
            const isAdvanced = advancedProps && advancedProps.indexOf(name) > -1; 

            let defaultValue = schemaProps[name].default;
            if (defaultValue === undefined || defaultValue === null) {
                defaultValue = "";
            }
            else {
                defaultValue = defaultValue.toString();
            }

            const value = jobOrder.parameters[name];
            const text = value !== undefined ? String(value) : "";

            if(isAdvanced && !advanced) {
                return null;
            }
            else {
                return(<tr key={name}>
                    <td className="sc-name">
                        {name}
                        </td>
                    <td>
                        {isFile ?
                            <FileDropTarget id={name} onFiles={this.onDropFiles}>
                                <LineEdit id={name} text={text} onBlur={this.onParamChange} />
                            </FileDropTarget> :
                            <LineEdit id={name} text={text} onBlur={this.onParamChange} />}
                    </td>
                    <td>
                        {isFile ? <Badge type="file">File</Badge> : null}
                        {isRequired ? <Badge warning>Required</Badge> : null}
                        <span className="sc-default-value">{defaultValue}</span>
                    </td>
                </tr>);
            }
        });

        const overlay = this.state.isUploading ? (
            <Overlay>
                <FlexContainer
                    position="fill"
                    alignItems="center"
                    justifyContent="center">

                    <BusyBox
                        text="Uploading files..."/>

                </FlexContainer>
            </Overlay>
        ) : null;

        return (
            <FlexContainer
                className={this.props.className}
                position="fill"
                direction="vertical" >

                <FlexItem
                    className="sc-header"
                    grow={0}>

                    <FlexContainer
                        direction="horizontal"
                        alignItems="center">

                        <Label>Job ID</Label>
                        <LineEdit id="id" text={jobOrder.id} onBlur={this.onSettingChange} />
                        <Label>Job Name</Label>
                        <LineEdit id="name" text={jobOrder.name} onBlur={this.onSettingChange} />

                        <Checkbox 
                            shape="square" 
                            text="Advanced"
                            selected={this.state.isAdvancedActive}
                            onTap={this.onTapAdvanced}
                        />

                        <Button
                            faIcon="undo-alt"
                            title="Initialize job from recipe"
                            enabled={edited}
                            onTap={this.onTapReset}
                        />
                        <Button
                            faIcon="plus"
                            title="Create job on server"
                            enabled={edited}
                            onTap={this.onTapCreate}
                        />
                        <Button
                            faIcon="cloud-upload-alt"
                            title="Create job on server, upload files"
                            enabled={edited}
                            onTap={this.onTapUpload}
                        />

                    </FlexContainer>
                    <Label className="sc-description">
                        Using Recipe <Badge>{recipe.name}</Badge> - {recipe.description}
                    </Label>
                </FlexItem>

                <FlexItem
                    className="sc-scroll-wrapper">

                    <table className="sc-table sc-parameters">
                        <colgroup>
                            <col className="name"/>
                            <col className="input"/>
                            <col className="default"/>
                        </colgroup>
                        <tbody>
                            {tableRows}
                        </tbody>
                    </table>
                </FlexItem>

                {overlay}
            </FlexContainer>
        );
    }

    protected onSettingChange(event: ILineEditBlurEvent)
    {
        this.setState(prevState => {
            const jobOrder = prevState.jobOrder;
            jobOrder[event.id] = event.text;
            return { jobOrder, isEdited: true };
        });
    }

    protected onParamChange(event: ILineEditBlurEvent)
    {
        const key = event.id;
        const text = event.text;
        const schema: any = this.props.recipe.parameterSchema;
        const prop = schema.properties[key];

        this.setState(prevState => {
            const jobOrder = prevState.jobOrder;

            if (text === "") {
                if (key in jobOrder.parameters) {
                    delete jobOrder.parameters[key];
                }
            }
            else {
                let value: any = text;
                if (prop.type === "integer") {
                    value = parseInt(text) || 0;
                }
                else if (prop.type === "number") {
                    value = parseInt(text) || 0;
                }
                else if (prop.type === "boolean") {
                    value = text.toLowerCase() === "true";
                }

                jobOrder.parameters[key] = value;
            }

            return { jobOrder, isEdited: true };
        });
    }

    protected onDropFiles(files: FileList, id: string)
    {
        const file = files.length > 0 ? files.item(0) : null;
        if (!file) {
            return;
        }

        if(file.type == "" && file.size%4096 == 0) {
            alert("Please zip a folder before uploading");
            return;
        }

        this.setState(prevState => {
            const jobOrder = prevState.jobOrder;
            jobOrder.parameters[id] = file.name;

            const filesToUpload = prevState.filesToUpload;
            filesToUpload[id] = file;

            return { jobOrder, filesToUpload, isEdited: true };
        });
    }

    protected onTapReset(event: IButtonTapEvent)
    {
        const props = this.props;

        if (!props.recipe) {
            alert("Please select a recipe first.");
            return;
        }

        if (!props.clientId) {
            alert("Please specify your client ID first.");
            return;
        }

        this.setState({
            recipe: props.recipe,
            jobOrder: JobCreateView.createJobOrder(props.clientId, props.recipe),
            filesToUpload: {},
            isEdited: false,
            isUploading: false
        });
    }

    protected onTapCreate(event: IButtonTapEvent)
    {
        const jobOrder = this.state.jobOrder;
        jobOrder.submission = new Date().toISOString();
        this.createJob(jobOrder)
            .catch(error => {
                alert(`SERVER ERROR:\n${error.message}`);
            });
    }

    protected onTapUpload(event: IButtonTapEvent)
    {
        const jobOrder = this.state.jobOrder;
        jobOrder.submission = new Date().toISOString();

        const fileDict = this.state.filesToUpload;
        const files = Object.keys(fileDict).map(key => fileDict[key]);

        this.createJob(jobOrder)
            .then(() =>
                this.uploadFiles(files, jobOrder.id)
            )
            .catch(error => {
                alert(`SERVER ERROR:\n${error.message}`);
            });
    }

    protected onTapAdvanced(event: IButtonTapEvent)
    {
        this.setState({ isAdvancedActive: !this.state.isAdvancedActive});
    }

    protected createJob(jobOrder: IJobOrder): Promise<void>
    {
        const clientId = this.props.clientId;
        if (!clientId) {
            return Promise.reject(new Error("Client ID not set."));
        }

        return fetch.json("/job", "POST", this.state.jobOrder);
    }

    protected uploadFiles(files: File[], jobId: string): Promise<any>
    {
        const page = window.location;
        const webDAVUrl = `${page.protocol}//${page.hostname}:${page.port}/${jobId}`;

        this.setState({ isUploading: true });

        return Promise.all(files.map(file => fetch.file(`${webDAVUrl}/${file.name}`, "PUT", file, false)))
        .then(() => {
            this.setState({ isUploading: false });
        })
        .catch(error => {
            this.setState({ isUploading: false });
            throw error;
        });
    }
}