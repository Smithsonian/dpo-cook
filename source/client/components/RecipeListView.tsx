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
import * as Reactable from "reactable";

import FlexContainer from "@ff/react/FlexContainer";
import FlexItem from "@ff/react/FlexItem";

import { IRecipeInfo } from "common/types";

////////////////////////////////////////////////////////////////////////////////

/** Properties for [[RecipeListView]] component. */
export interface IRecipeListViewProps
{
    className?: string;
    recipeInfos: IRecipeInfo[];
    selectedRecipeId: string;
    onRecipeSelect: (id: string) => void;
}

export default class RecipeListView extends React.Component<IRecipeListViewProps, {}>
{
    static defaultProps: Partial<IRecipeListViewProps> = {
        className: "sc-recipe-list-view",
        selectedRecipeId: ""
    };

    render()
    {
        const Table = Reactable.Table;
        const Tr = Reactable.Tr;

        const tableRows = this.props.recipeInfos.map(recipe => {
            const row = {
                "Id": recipe.id,
                "Name": recipe.name,
                "Version": recipe.version,
                "Description": recipe.description
            };

            const isSelected = this.props.selectedRecipeId === recipe.id;

            const attribs = {
                key: recipe.id,
                className: "sc-tr sc-selectable" + (isSelected ? " sc-selected" : ""),
                data: row,
                onClick: () => this.onRecipeClick(recipe.id)
            };

            return (<Tr {...attribs} />);
        });

        const tableArgs = {
            className: "sc-table",
            noDataText: "No recipes available"
        };

        return (
            <FlexContainer
                className={this.props.className}
                position="fill"
                direction="vertical" >

                <FlexItem
                    className="sc-scroll-wrapper">
                    <Table {...tableArgs} >
                        {tableRows}
                    </Table>
                </FlexItem>
            </FlexContainer>
        );
    }

    protected onRecipeClick(id: string)
    {
        if (this.props.onRecipeSelect) {
            this.props.onRecipeSelect(id);
        }
    }
}