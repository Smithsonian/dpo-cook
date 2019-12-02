---
title: Rizom UV
summary: UV unwrapping tool.
---

### Information

- Developer: Rizom-Lab SAS, Marseille
- Website: https://www.rizom-lab.com/rizomuv-vs/
- License: Commercial/Proprietary

### Installation

- Recommended version with Cook: *RizomUV_VSRS.2018.0.85.g41754c4.master.exe*. Later versions have a regression bug
 preventing proper UV unwrapping in script mode. 
- Windows installer: https://www.rizom-lab.com/my-account/downloads/

### Configuration

Example configuration for ImageMagick in the `tools.json` configuration file:

```json
"RizomUV": {
    "executable": "C:\\Program Files\\Rizom Lab\\RizomUV VS RS 2018.0\\rizomuv.exe",
    "version": "RizomUV_VSRS.2018.0.85.g41754c4.master",
    "maxInstances": 2,
    "timeout": 1800
}
```