---
title: Meshlab
summary: Mesh manipulation tool.
---

### Information

- Developer: Paolo Cignoni, Guido Ranzuglia, Visual Computing Lab, ISTI-CNR 
- Website: http://www.meshlab.net/
- Github repository: http://github.com/cnr-isti-vclab/meshlab
- License: https://github.com/cnr-isti-vclab/meshlab/blob/master/LICENSE.txt

### Installation

- Cook supports both older (meshlabserver.exe) and newer (PyMeshLab) versions.
- Most recent version tested with Cook: "v2021.10"

### Configuration

Example configuration for Meshlab in the `tools.json` configuration file. The top two commented
lines reflect how to configure the older 'meshlabserver' versions:

```json
"Meshlab": {
  //"executable": "C:\\Tools\\MeshlabMini\\meshlabserver.exe",
  //"version": "v2019.5, 2019-05-02",
  "executable": "C:\\Python39\\python.exe",  // 2021 versions and on use PyMeshLab
  "version": "v2021.10",
  "maxInstances": 3,
  "timeout": 1800 // 30 minutes
}
```