---
title: RapidCompact/RapidPipeline
summary: All-in-one mesh simplification, UV unwrapping, and map baking tool.
---

### Information

- Developer: [Darmstadt Graphics Group GmbH](https://rapidpipeline.com/en/about/)
- Website: https://rapidpipeline.com/
- License: Commercial/Proprietary

### Installation

- Recommended version with Cook: *6.7.0*
- **Note** - the currently supported version above is branded as RapidCompact, though newer versions of the software are available as RapidPipeline.
- Windows binary available to registered customers

### Configuration

Example configuration for RapidCompact in the `tools.json` configuration file:

```json
"RapidCompact": {
    "executable": "C:\\Program Files\\RapidCompact CLI 6.7.0\\rpdx.exe",
    "version": "6.7.0",
    "maxInstances": 3,
    "timeout": 900
}
```