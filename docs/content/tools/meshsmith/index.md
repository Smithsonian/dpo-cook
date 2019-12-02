---
title: MeshSmith
summary: Mesh conversion tool based on the Assimp library.
---

### Information

- Developer: [Ralph Wiedemeier, Frame Factory GmbH](https://github.com/framefactory) for Smithsonian DPO
- Github repository: https://github.com/Smithsonian/dpo-meshsmith
- License: https://github.com/Smithsonian/dpo-meshsmith/blob/master/LICENSE.md

### Installation

- Windows binary: https://github.com/Smithsonian/dpo-meshsmith/releases/download/v0.7.0/meshsmith_2019-08-13_release.zip
- Instructions for building from source can be found on Github

### Configuration

Example configuration for MeshSmith in the `tools.json` configuration file:

"MeshSmith": {
    "executable": "C:\\Tools\\MeshSmith\\MeshSmith.exe",
    "version": "v0.7.0, 2019-08-13",
    "maxInstances": 3,
    "timeout": 600 // 10 minutes
}