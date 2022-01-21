---
title: InspectMesh
summary: Inspects a mesh file and provides a detailed report with topological, geometric, and statistical information.
---


### Description

Inspects a mesh file and provides a detailed report with topological, geometric, and statistical features, including

- number of vertices
- number of faces
- number of triangles
- number of edges
- manifoldness
- watertightness
- bounding box
- volume

### Options

| Option         | Type    | Required | Default   | Description                                                                              |
|----------------|---------|----------|-----------|------------------------------------------------------------------------------------------|
| meshFile       | string  | yes      |           | File name of the mesh to be inspected.                                                   |
| reportFile     | string  | no       |           | If given, the resulting report will be stored in a file with this name.                  |
| timeout        | number  | no       | 0         | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup). |
| tool           | string  | no       | "MeshSmith" | The inspection tool to be used, either "Blender" or "MeshSmith". Default is MeshSmith.     |