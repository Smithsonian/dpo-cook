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

import * as moment from "moment";

import * as React from "react";
import * as Reactable from "reactable";

import fetch from "@ff/browser/fetch";

import FlexContainer from "@ff/react/FlexContainer";
import FlexItem from "@ff/react/FlexItem";
import Button, { IButtonTapEvent } from "@ff/react/Button";

import { IJobInfo } from "common/types";

////////////////////////////////////////////////////////////////////////////////

/** Properties for [[JobListView]] component. */
export interface IJobListViewProps
{
    className?: string;
    clientId: string;
    jobInfos: IJobInfo[];
    selectedJobId: string;
    onJobSelect: (id: string) => void;
    onJobRemove: (id: string) => void;
}

interface IJobListViewState
{
}

export default class JobListView extends React.Component<IJobListViewProps, IJobListViewState>
{
    static defaultProps: Partial<IJobListViewProps> = {
        className: "sc-job-list-view",
        selectedJobId: ""
    };

    protected timerHandle: number;
    protected hiddenElement: HTMLTextAreaElement;

    constructor(props: IJobListViewProps)
    {
        super(props);

        this.onClickJob = this.onClickJob.bind(this);
        this.onTapCopy = this.onTapCopy.bind(this);
        this.onTapStart = this.onTapStart.bind(this);
        this.onTapCancel = this.onTapCancel.bind(this);
        this.onTapRemove = this.onTapRemove.bind(this);
        this.onTapVoyager = this.onTapVoyager.bind(this);

        // hidden input element for clipboard copy operation
        this.hiddenElement = document.createElement("textarea");
        this.hiddenElement.style.position = "absolute";
        this.hiddenElement.style.zIndex = "-1000";
    }

    componentDidMount()
    {
        document.body.appendChild(this.hiddenElement);
    }

    componentWillUnmount()
    {
        document.body.removeChild(this.hiddenElement);
    }

    render()
    {
        const Table = Reactable.Table;
        const Tr = Reactable.Tr;
        const Td = Reactable.Td;

        const tableRows = this.props.jobInfos.map(job => {

            const isSelected = this.props.selectedJobId === job.id;

            const started = job.start ? moment(job.start).format("YYYY-MM-DD HH:mm:ss") : "-";
            const ended = job.end ? moment(job.end).format("YYYY-MM-DD HH:mm:ss") : "-";

            const rowAttribs = {
                key: job.id,
                className: "sc-tr sc-selectable" + (isSelected ? " sc-selected" : ""),
                onClick: () => this.onClickJob(job.id)
            };

            return (<Tr {...rowAttribs}>
                <Td column="Id">{job.id}</Td>
                <Td column="Name">{job.name}</Td>
                <Td column="Recipe">{job.recipe.name}</Td>
                <Td column="State"><b>{job.state}</b></Td>
                <Td column="CurrentStep">{job.step}</Td>
                <Td column="Started">{started}</Td>
                <Td column="Ended">{ended}</Td>
                <Td column=""><div>
                    <Button
                        id={job.id}
                        faIcon="folder-open"
                        title="Copy WebDAV folder path to clipboard"
                        onTap={this.onTapCopy} />
                    <Button
                        id={job.id}
                        faIcon="play"
                        title="Start job"
                        onTap={this.onTapStart} />
                    <Button
                        id={job.id}
                        faIcon="stop"
                        title="Cancel job"
                        onTap={this.onTapCancel} />
                    <Button
                        id={job.id}
                        faIcon="trash-alt"
                        title="Delete job and files"
                        onTap={this.onTapRemove} />
                     <Button
                        id={job.id}
                        faIcon="eye"
                        title="Copy Voyager path to clipboard"
                        onTap={this.onTapVoyager} />
                </div></Td>
            </Tr>);
        });

        const tableAttribs: any = {
            className: "sc-table",
            sortable: true,
            noDataText: "No jobs in queue"
        };

        return (
            <FlexContainer
                className={this.props.className}
                position="fill"
                direction="vertical" >

                <FlexItem
                    className="sc-scroll-wrapper">
                    <Table {...tableAttribs} >
                        {tableRows}
                    </Table>
                </FlexItem>
            </FlexContainer>
        );
    }

    protected onClickJob(id: string)
    {
        this.props.onJobSelect(id);
    }

    protected onTapCopy(event: IButtonTapEvent)
    {
        const location = window.location;
        //const webUrl = `${location.protocol}//${location.host}/${event.id}`;
        const explorerUrl = `\\\\${location.hostname}@${location.port}\\${event.id}`;

        this.hiddenElement.value = explorerUrl;
        this.hiddenElement.select();
        document.execCommand("copy");
    }

    protected onTapVoyager(event: IButtonTapEvent)
    {
        //Cook:
        //const explorerUrl = `http://si-3dvm01.si.edu:9040/voyager-story-dev.html?mode=story&root=cook/${event.id}/&document=scene.svx.json`;
        
        //Cook2:
        //const explorerUrl = `http://si-3dvm01.si.edu:9040/voyager-story-dev.html?mode=story&root=cook2/${event.id}/&document=scene.svx.json`;

        //Dev:
        const explorerUrl = `http://si-3dvm01.si.edu:9040/voyager-story-dev.html?mode=story&root=cookdev/${event.id}/&document=scene.svx.json`;
        
        this.hiddenElement.value = explorerUrl;
        this.hiddenElement.select();
        document.execCommand("copy");
    }

    protected onTapStart(event: IButtonTapEvent)
    {
        const clientId = this.props.clientId;
        if (!clientId) {
            alert("Client ID not set.");
            return;
        }

        fetch.json(`/clients/${clientId}/jobs/${event.id}/run`, "PATCH")
        .catch(error => {
            alert(`SERVER ERROR\n${error.message}`);
        });
    }

    protected onTapCancel(event: IButtonTapEvent)
    {
        const clientId = this.props.clientId;
        if (!clientId) {
            alert("Client ID not set.");
            return;
        }

        fetch.json(`/clients/${clientId}/jobs/${event.id}/cancel`, "PATCH")
        .catch(error => {
            alert(`SERVER ERROR\n${error.message}`);
        });
    }

    protected onTapRemove(event: IButtonTapEvent)
    {
        const jobId = event.id;
        const clientId = this.props.clientId;
        if (!clientId) {
            alert("Client ID not set.");
            return;
        }

        if (!confirm("Delete job and files.\nAre you sure?")) {
            return;
        }

        this.props.onJobRemove(jobId);

        fetch.json(`/clients/${clientId}/jobs/${jobId}`, "DELETE")
        .catch(error => {
            alert(`SERVER ERROR\n${error.message}`);
        });
    }
}