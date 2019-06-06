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

import CLIProcessor from "./CLIProcessor";

////////////////////////////////////////////////////////////////////////////////

// console.log(`
// Cook CLI - Home Cooked Processing Recipes
// Copyright 2019 Smithsonian Institution
// License: http://www.apache.org/licenses/LICENSE-2.0
// `);

const processor = new CLIProcessor();
processor.execute(process.argv);

