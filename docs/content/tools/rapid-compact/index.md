---
title: RapidCompact
summary: All-in-one mesh simplification, UV unwrapping, and map baking tool.
---

### Information

- Developer: [Darmstadt Graphics Group GmbH](https://www.dgg3d.com/)
- Website: https://www.dgg3d.com/rapidcompact
- License: Commercial/Proprietary

### Installation

- Recommended version with Cook: *4.2.1*
- Windows binary available to registered customers

### Configuration

Example configuration for RapidCompact in the `tools.json` configuration file:

```json
"RapidCompact": {
    "executable": "C:\\Program Files\\RapidCompact CLI 4.2.1\\rpdx.exe",
    "version": "4.2.1",
    "maxInstances": 3,
    "timeout": 900
}
```

### Options

| Option                  | Required                           | Type    | Values/Description                                                                       | Default |
|-------------------------|------------------------------------|---------|------------------------------------------------------------------------------------------|---------|
| highPolyMeshFile        | "bake" only                        | string  | file path                                                                                |         |
| lowPolyMeshFile         | "bake" only                        | string  | file path                                                                                |         |
| inputMeshFile           | yes except "bake"                  | string  | file path                                                                                |         |
| outputMeshFile          | yes except "bake"                  | string  | file path                                                                                |         |
| mapBaseName             | for "bake"                         | string  | base name for baked maps                                                                 |         |
| mode                    | yes                                | string  | "decimate", "unwrap", "decimate-unwrap", "bake"                                          |         |
| removeDuplicateVertices | no                                 | boolean |                                                                                          | false   |
| numFaces                | "decimate", "decimate-unwrap" only | number  |                                                                                          |         |
| unwrapMethod            | no                                 | number  | 0 = fixedBoundary, 1 = fastConformal, 2 = conformal, 3 = isometric, 4 = forwardBijective | 4       |
| mapSize                 | "bake" only                        | number  |                                                                                          | 2048    |
| bakeOcclusion           | no                                 | boolean |                                                                                          | false   |
| occlusionRays           | no                                 | number  |                                                                                          | 128     |
| normalsTangentSpace     | no                                 | boolean |                                                                                          | false   |
| preserveBoundary        | no                                 | boolean |                                                                                          | true    |