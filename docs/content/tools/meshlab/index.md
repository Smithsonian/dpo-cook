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

- In order to enable mesh statistics, you need to install a modified meshlab server version from
https://github.com/framefactory/meshlab
- An precompiled binary is available on the Smithsonian internal digitization drive
- Recommended version with Cook: *2019.12, 2019-12-02*

### Configuration

Example configuration for Meshlab in the `tools.json` configuration file:

```json
"Meshlab": {
    "executable": "C:\\Tools\\MeshlabMini\\meshlabserver.exe",
    "version": "2019.12, 2019-12-02",
    "maxInstances": 3,
    "timeout": 1800
}
```