---
title: ConvertMesh
summary: Converts geometric mesh data between various file formats.
---

### Description

Converts geometric mesh data between various file formats.
 
The task is usually executed by Smithsonian's own MeshSmith tool, except for conversions from FBX to GLB or glTF
which are done by FBX2glTF. Meshlab can also be used if specified explicitly (set `useMeshlab` to true), but
Meshlab understands less input and output formats.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| inputMeshFile  | string  | yes      |         | Input mesh file name.                                                                    |
| outputMeshFile | string  | yes      |         | Converted (output) mesh file name.                                                       |
| stripNormals   | boolean | no       | false   | Removes normals if true.                                                                 |
| stripTexCoords | boolean | no       | false   | Removes UVs (texture coordinates) if true.                                               |
| joinVertices   | boolean | no       | false   | Joins identical vertices if true. Using this option can reduce file size significantly.  |
| useCompression | boolean | no       | false   | FBX2glTF only: use DRACO mesh compression.                                               |
| computeNormals | string  | no       | -       | FBX2glTF only: recompute normals. Valid options: "never", "broken", "missing", "always". |
| scale          | number  | no       | 1.0     | MeshSmith only: scales the mesh by the given factor if set.                              |
| translate      | [x,y,z] | no       | [0,0,0] | MeshSmith only: translates the mesh by the given vector if set.                          |
| swizzle        | string  | no       | -       | MeshSmith only: Custom swizzle operation if set. Example: "X+Z+Y-".                      |
| timeout        | number  | no       | 0       | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup). |
| useMeshlab     | boolean | no       | false   | Forces the use of Meshlab if true.                                                       |
