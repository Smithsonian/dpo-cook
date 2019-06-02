---
title: DecimateMesh
summary: Reduces the size of a mesh by simplifying its structure.
---


### Description

Reduces the complexity of a geometric mesh by reducing the number of vertices.

Tools: [Meshlab](../tools/meshlab.md), [InstantUV/MopsCLI](../tools/mops.md)

### Options

| Option               | Type    | Required | Default   | Description                                                                                  |
|----------------------|---------|----------|-----------|----------------------------------------------------------------------------------------------|
| inputMeshFile        | string  | yes      |           | Input (high poly) mesh file name.                                                            |
| outputMeshFile       | string  | yes      |           | Output (low poly) mesh file name.                                                            |
| numFaces             | number  | yes      |           | Target number of faces after decimation.                                                     |
| cleanup              | boolean | no       | false     | Removes unreferenced and duplicate vertices before decimation if true.                       |
| preserveTopology     | boolean | no       | true      | If true, preserves the topology of the mesh.                                                 |
| preserveBoundaries   | boolean | no       | true      | If true, preserves the meshes' boundaries, i.e. doesn't remove boundary vertices.            |
| preserveTexCoords    | boolean | no       | false     | Preserves texture coordinates during decimation.                                             |
| minComponentSize     | string  | no       | -         | Meshlab only: Removes components smaller than the given size. Example: "2%".                 |
| computeVertexNormals | boolean | no       | false     | Meshlab only: Re-computes vertex normals for the decimated mesh.                             |
| inspectMesh          | boolean | no       | false     | Meshlab only: performs mesh inspection before decimation and generates an inspection report. |
| timeout              | number  | no       | 0         | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup).     |
| tool                 | string  | no       | "Meshlab" | Tool to use for decimation: "Meshlab" or "Mops".                                             |