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

import "./main.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";

import parseUrlParameter from "@ff/browser/parseUrlParameter";

import ClientApplication from "./components/ClientApplication";

////////////////////////////////////////////////////////////////////////////////

console.log(`
  _________       .__  __  .__                        .__                ________ ________   
 /   _____/ _____ |__|/  |_|  |__   __________   ____ |__|____    ____   \\_____  \\\\______ \\  
 \\_____  \\ /     \\|  \\   __\\  |  \\ /  ___/  _ \\ /    \\|  \\__  \\  /    \\    _(__  < |    |  \\ 
 /        \\  Y Y  \\  ||  | |   Y  \\\\___ (  <_> )   |  \\  |/ __ \\|   |  \\  /       \\|    \`   \\
/_______  /__|_|  /__||__| |___|  /____  >____/|___|  /__(____  /___|  / /______  /_______  /
        \\/      \\/              \\/     \\/           \\/        \\/     \\/         \\/        \\/ 
    
Cook - 3D Model/Geometry/Texture Processing Server
3D Foundation Project
(c) 2023 Smithsonian Institution

https://3d.si.edu
https://github.com/smithsonian/dpo-cook

-----------------------------------------------------
Version: ${ENV_VERSION}
-----------------------------------------------------
`);

const reset = parseUrlParameter("reset");

ReactDOM.render(
    <ClientApplication
        reset={reset !== undefined} />,
    document.getElementById("main")
);