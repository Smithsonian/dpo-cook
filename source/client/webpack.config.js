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

"use strict";

var path = require('path');
const childProcess = require("child_process");
const moment = require("moment");
const webpack = require("webpack");
const dotenv = require('dotenv');

var MiniCssExtractPlugin = require("mini-css-extract-plugin");

//////////////////////////////////////////////////////////////////////////////// 

var projectDir = path.resolve(__dirname, "../..");
var sourceDir = path.resolve(projectDir, "source");
var targetDir = path.resolve(projectDir, "server/static/app");
var moduleDir = path.resolve(projectDir, "node_modules");
var libDir = path.resolve(projectDir, "libs");

////////////////////////////////////////////////////////////////////////////////

const envs = dotenv.config().parsed;
var envKeys = Object.keys(envs).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(envs[next]);
    return prev;
}, {});
const isDevMode = process.env["NODE_ENV"] !== "production";
const version = childProcess.execSync("git describe --tags").toString().trim();

////////////////////////////////////////////////////////////////////////////////

module.exports = {
    mode: isDevMode ? "development" : "production",

    entry: {
        "main": path.resolve(sourceDir, "client/main.tsx")
    },

    output: {
        path: targetDir,
        filename: "[name].js"
    },

    // Enable source maps for debugging webpack's output.
    devtool: "source-map",

    resolve: {
        modules: [
            moduleDir
        ],
        // Aliases for FF Foundation Library components
        alias: {
            "common": path.resolve(sourceDir, "common"),
            "@ff/core": path.resolve(libDir, "ff-core/source"),
            "@ff/react": path.resolve(libDir, "ff-react/source"),
            "@ff/browser": path.resolve(libDir, "ff-browser/source")
        },
        // Resolvable extensions
        extensions: [".ts", ".tsx", ".js", ".json"]
    },

    plugins: [
        new webpack.DefinePlugin({
            APP_ENVIRONMENT: envKeys["process.env.REACT_APP_ENV"],
            ENV_VERSION: JSON.stringify(`${moment().format("YYYY-MM-DD")} ${version}`)
        }),
        new MiniCssExtractPlugin({
            filename: "[name].css",
            allChunks: true
        })
    ],

    module: {
        rules: [
            {
                // Typescript/JSX files
                test: /\.tsx?$/,
                loader: "awesome-typescript-loader"
            },
            {
                // Enforce source maps for all javascript files
                enforce: "pre",
                test: /\.js$/,
                loader: "source-map-loader"
            },
            {
                // Transpile SCSS to CSS and concatenate
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader",
                    "sass-loader"
                ]
            },
            {
                // Concatenate CSS
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'style-loader',
                    'css-loader'
                ]
            }
        ]
    },

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    externals: {
        "react": "React",
        "react-dom": "ReactDOM",
        "socket.io": "io",
        "three": "THREE"
    }
};
