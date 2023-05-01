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

import * as React from "react";
import JSONTree from "react-json-tree";

import FlexContainer from "@ff/react/FlexContainer";
import FlexItem from "@ff/react/FlexItem";
import Button from "@ff/react/Button";

////////////////////////////////////////////////////////////////////////////////

/** Properties for [[JsonDocumentView]] component. */
export interface IJsonDocumentViewProps
{
    className?: string;
    document: {};
    onRefresh?: () => void;
}

export default class JsonDocumentView extends React.Component<IJsonDocumentViewProps, {}>
{
    static defaultProps: Partial<IJsonDocumentViewProps> = {
        className: "sc-json-document-view"
    };

    protected hiddenElement: HTMLTextAreaElement;

    constructor(props: IJsonDocumentViewProps)
    {
        super(props);

        this.onTapCopy = this.onTapCopy.bind(this);
        this.onTapRefresh = this.onTapRefresh.bind(this);

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
        const document = this.props.document || {};

        const theme = {
            base00: '#2e2e2e',
            base01: '#383838',
            base02: '#484848',
            base03: '#707070',
            base04: '#a0a0a0',
            base05: '#c0c0c0',
            base06: '#e0e0e0',
            base07: '#ffffff',
            base08: '#f92672',
            base09: '#fd971f',
            base0A: '#f4bf75',
            base0B: '#e2cc84',
            base0C: '#a1efe4',
            base0D: '#c8c8c8',
            base0E: '#ae81ff',
            base0F: '#cc6633'
        };

        return (
            <React.Fragment>
                <FlexContainer
                    className={this.props.className}
                    position="fill"
                    direction="vertical" >

                    <FlexItem
                        className="sc-scroll-wrapper">

                        <JSONTree
                            data={document}
                            theme={theme}
                            invertTheme={false} />

                    </FlexItem>
                </FlexContainer>

                <div className="sc-overlay-buttons">
                    <Button
                        className="ff-button"
                        icon="fa fas fa-sync-alt"
                        onTap={this.onTapRefresh}/>

                    <Button
                        className="ff-button"
                        icon="fa fas fa-copy"
                        onTap={this.onTapCopy}/>
                </div>

            </React.Fragment>
        );
    }

    protected onTapCopy()
    {
        const text = JSON.stringify(this.props.document, null, 4);
        this.hiddenElement.value = text;
        this.hiddenElement.select();
        window.document.execCommand("copy");
    }

    protected onTapRefresh()
    {
        if (this.props.onRefresh) {
            this.props.onRefresh();
        }
    }
}