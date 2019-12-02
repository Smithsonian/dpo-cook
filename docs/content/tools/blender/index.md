---
title: Blender
summary: 3D content creation suite
weight: 105
---

### Note

_Blender support is planned for a future release of Cook._

### Information

- Developer: Blender Foundation
- Website: https://www.blender.org/
- License: https://www.blender.org/about/license/

### Installation

- Recommended version with Cook: *2.81*
- Windows binary: https://www.blender.org/download/Blender2.81/blender-2.81-windows64.msi/

### Configuration

Example configuration for Blender in the `tools.json` configuration file:

```json
"Blender": {
    "executable": "C:\\Program Files\\Blender Foundation\\Blender\\blender.exe",
    "version": "2.81",
    "maxInstances": 1,
    "timeout": 600
}
```