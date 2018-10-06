# Task: ConvertMesh

### Description

Converts geometric mesh data between various file formats.
 
The task is usually executed by the Intermesh tool, except for conversions from FBX to GLB or glTF
which are done by FBX2glTF. Meshlab can also be used if specified explicitly (useMeshlab), but
understands less input and output formats.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| inputMeshFile  | string  | yes      |         | Input mesh file name.                                                                    |
| outputMeshFile | string  | yes      |         | Converted (output) mesh file name.                                                       |
| stripNormals   | boolean | no       | false   | Removes normals if true.                                                                 |
| stripUVs       | boolean | no       | false   | Removes UVs (texture coordinates) if true.                                               |
| joinVertices   | boolean | no       | false   | Joins identical vertices if true. Using this option can reduce file size significantly.  |
| compress       | boolean | no       | false   | FBX2glTF only: use DRACO mesh compression.                                               |
| computeNormals | string  | no       | -       | FBX2glTF only: recompute normals. Valid options: "never", "broken", "missing", "always". |
| center         | boolean | no       | false   | Intermesh only: centers the mesh on the origin if true.                                  |
| scale          | number  | no       | 1.0     | Intermesh only: scales the mesh by the given factor if set.                              |
| swapYZ         | boolean | no       | false   | Intermesh only: swap Y and Z coordinates if true. This sets swizzle to "X+Z+Y-".         |
| swizzle        | string  | no       | -       | Intermesh only: Custom swizzle operation if set. Example: "X+Z+Y-".                      |
| timeout        | number  | no       | 0       | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup). |
| useMeshlab     | boolean | no       | false   | Force the use of Meshlab if true.                                                        |