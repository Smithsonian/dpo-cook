---
title: Blender
summary: 3D content creation suite
weight: 105
---

### Information

- Developer: Blender Foundation
- Website: https://www.blender.org/
- License: https://www.blender.org/about/license/

### Installation

- Recommended version with Cook: *3.6*
- Windows binary: https://www.blender.org/download/release/Blender3.6/blender-3.6.21-windows-x64.msi/

### Configuration

Example configuration for Blender in the `tools.json` configuration file:

```json
"Blender": {
    "executable": "C:\\Program Files\\Blender Foundation\\Blender 3.1\\blender.exe",
    "version": "3.6.21",
    "maxInstances": 1,
    "timeout": 600
}
```