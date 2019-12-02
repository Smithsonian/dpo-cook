---
title: Instant Meshes
summary: Remeshing tool, generates high quality, field-aligned, quad-dominant meshes. 
---

### Information

- Developer: Wenzel Jakob 
- Website: http://igl.ethz.ch/projects/instant-meshes/
- Github repository: https://github.com/wjakob/instant-meshes
- License: https://github.com/wjakob/instant-meshes/blob/master/LICENSE.txt

### Installation

- Binary for Windows: https://instant-meshes.s3.eu-central-1.amazonaws.com/Release/instant-meshes-windows.zip
- Download and unzip

### Configuration

Example configuration for Instant Meshes in the `tools.json` configuration file:

 ```json
"InstantMeshes": {
    "executable": "C:\\Tools\\Instant Meshes.exe",
    "version": "-",
    "maxInstances": 1,
    "timeout": 900
}
```