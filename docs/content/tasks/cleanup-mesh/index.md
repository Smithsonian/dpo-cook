---
title: CleanupMesh
summary: Uses a combination of Meshlab filters to clean a mesh.
---

### Description

Uses a combination of Meshlab filters to clean a mesh. The following
filters are applied:
- Remove Zero Area Faces
- Remove Unreferenced Vertices
- Remove Duplicate Vertices
- Remove Duplicate Faces

Tool: [Meshlab](../tools/meshlab.md)

### Options

| Option         | Type   | Required | Default | Description                                                                              |
|----------------|--------|----------|---------|------------------------------------------------------------------------------------------|
| inputMeshFile  | string | yes      |         | Input mesh file name.                                                                    |
| outputMeshFile | string | yes      |         | Output mesh file name.                                                                   |
| timeout        | number | no       | 0       | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup). |