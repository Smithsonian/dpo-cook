# Task: UnwrapMesh

### Description

Unwraps a mesh's surface onto a plane and generates a set of texture coordinates for map baking.

### Options

| Option               | Type    | Required | Default            | Description                                                                                                                         |
|----------------------|---------|----------|--------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| inputMeshFile        | string  | yes      |                    | Input mesh file name.                                                                                                               |
| outputMeshFile       | string  | yes      |                    | Output mesh file name.                                                                                                              |
| saveObj              | boolean | no       | false              | Unfold only: saves the mesh as (additional) OBJ file.                                                                               |
| saveFbx              | boolean | no       | false              | Unfold only: saves the mesh as (additional) FBX file.                                                                               |
| saveCollada          | boolean | no       | false              | Unfold only: saves the mesh as (additional) Collada file.                                                                           |
| decimate             | boolean | no       | false              | Mops only: indicates whether the mesh should be decimated before unwrapping.                                                        |
| numFaces             | number  | no       |                    | Mops only: if decimation is enabled, the target number of faces.                                                                    |
| mapSize              | number  | no       | 2048               | The size of the texture maps that will be baked (needed to calculate the gap between patches).                                      |
| segmentationStrength | number  | no       | 0.5                | A number between 0 and 1 specifying how aggressively the mesh surface is segmented. Default is 0.5.                                 |
| packEffort           | number  | no       | 0.5                | A number between 0 and 1 specifying how tightly the patches should be packed. Default is 0.5.                                       |
| cutHandles           | boolean | no       | true               | Unfold only: decides whether handles can be cut during segmentation.                                                                |
| unwrapMethod         | string  | no       | "forwardBijective" | Mops only: the algorithm to be used for unwrapping: "conformal", "fastConformal", "isometric", "forwardBijective", "fixedBoundary". |
| debug                | boolean | no       | false              | Unwrapping tool is run in debug mode. For Unfold: tool doesn't close after it's done.                                               |
| timeout              | number  | no       | 0                  | Maximum task execution time in seconds.                                                                                             |
| tool                 | string  | no       | "Unfold"           | Tool to be used for unwrapping, options are "Unfold", "Mops", "Unknit". Default is "Unfold".                                        |
