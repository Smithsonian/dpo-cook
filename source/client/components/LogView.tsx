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
import * as io from 'socket.io-client';
import * as moment from "moment";

import FlexContainer from "@ff/react/FlexContainer";
import FlexItem from "@ff/react/FlexItem";

import { IJobLogEvent } from "common/types";

////////////////////////////////////////////////////////////////////////////////

/** Properties for [[LogView]] component. */
export interface ILogViewProps
{
    className?: string;
    clientId: string;
}

interface ILogViewState
{
    logEvents: IJobLogEvent[];
}

export default class LogView extends React.Component<ILogViewProps, ILogViewState>
{
    static defaultProps: Partial<ILogViewProps> = {
        className: "log-view"
    };

    protected socket: io.Socket;
    protected ref: React.RefObject<HTMLDivElement>;

    constructor(props: ILogViewProps)
    {
        super(props);

        this.socket = null;
        this.ref = React.createRef();

        this.state = {
            logEvents: []
        };
    }

    componentDidMount()
    {
        this.socket = io();

        this.socket.on("connect", () => {
            this.socket.emit("hello", this.props.clientId);
        });

        this.socket.on("log", event => {
            this.setState(prevState => {
                const logEvents = prevState.logEvents;
                logEvents.push(event);
                return {
                    logEvents
                };
            });
        });
    }

    componentWillUnmount()
    {
        this.socket.disconnect();
        this.socket = null;
    }

    componentDidUpdate()
    {
        this.ref.current.scrollTop = this.ref.current.scrollHeight;
    }

    render()
    {
        const logEvents = this.state.logEvents;
        const lastIndex = logEvents.length - 1;
        const firstIndex = Math.max(0, lastIndex - 200);

        let log = [];

        for (let i = firstIndex; i <= lastIndex; ++i) {
            const event = logEvents[i];
            const time = moment(event.time).format("YYYY-MM-DD HH:mm:ss");
            const level = (event.level.toUpperCase() + " ").substring(0, 5);
            const module = event.module[0].toUpperCase() + event.module.substring(1);
            const sender = event.sender ? `'${event.sender}' ` : "";

            log.push(<div key={i} className="entry">
                <span className="time">{time}&nbsp;</span>
                <span className="level">{level}&nbsp;</span>
                <span className="module">{module}&nbsp;</span>
                <span className="sender">{sender}&nbsp;</span>
                <span className="message">{event.message}</span>
            </div>);
        }


        return (
            <FlexContainer
                className={this.props.className}
                position="fill"
                direction="vertical" >

                <FlexItem
                    className="scroll-wrapper"
                    elementRef={this.ref}>
                    {log}
                </FlexItem>
            </FlexContainer>
        );
    }
}