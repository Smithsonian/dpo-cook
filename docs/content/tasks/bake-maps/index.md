---
title: BakeMaps
summary: Bakes various mesh features to a texture.
---

### Description

Texture baking is the last step when preparing models for real-time applications. During decimation, the mesh has been reduced in size. Texture baking transfers features from the high resolution mesh to a texture. The texture is then applied to the low resolution mesh in order to bring back the lost details.

Baking requires a low poly mesh with UV coordinates. The coordinates can be generated using the [UnwrapMeshTask](./unwrap-mesh).

This task utilizes the following tools:
- [XNormal](../tools/xnormal)
- [RapidCompact](../tools/rapid-compact)

### Options

| Option                   | Type    | Required | Default   | Description                                                                              |
| ------------------------ | ------- | -------- | --------- | ---------------------------------------------------------------------------------------- |
| highPolyMeshFile         | string  | yes      |           | High resolution mesh file name.                                                          |
| highPolyDiffuseMapFile   | string  | no       |           | Diffuse texture for high resolution mesh.                                                |
| lowPolyUnwrappedMeshFile | string  | yes      |           | Low resolution (decimated) mesh file name.                                               |
| mapBaseName              | string  | no       |           | Base name for baked texture map files.                                                   |
| mapSize                  | number  | yes      | 2048      | Baked map size in pixels.                                                                |
| maxRayDistance           | number  | no       | 0.001     | Maximum search distance when projecting rays from the high poly to the low poly mesh.    |
| bakeDiffuse              | boolean | no       | true      | Bakes a diffuse map if true and highPolyDiffuseMapFile is not empty.                     |
| bakeOcclusion            | boolean | no       | true      | Bakes an ambient occlusion map if true.                                                  |
| bakeNormals              | boolean | no       | true      | Bakes a normal map if true.                                                              |
| bakeTest                 | boolean | no       | false     | Bakes a test map for checking the projection quality if true.                            |
| occlusionRays            | number  | no       | 128       | Number of sample rays for ambient occlusion, between 1 and 512.                          |
| occlusionConeAngle       | number  | no       | 165       | Maximum cone angle for ambient occlusion sample rays, between 1 and 165                  |
| occlusionAttConstant     | number  | no       | 1         | Ambient occlusion attenuation, constant factor.                                          |
| occlusionAttLinear       | number  | no       | 0         | Ambient occlusion attenuation, linear factor.                                            |
| occlusionAttQuadratic    | number  | no       | 0         | Ambient occlusion attenuation, quadratic factor.                                         |
| tangentSpaceNormals      | boolean | no       | false     | Bakes normals in tangent space if true.                                                  |
| timeout                  | number  | no       | 0         | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup). |
| tool                     | string  | no       | "XNormal" | Baking tool to use: "XNormal" or "RapidCompact"                                          |
