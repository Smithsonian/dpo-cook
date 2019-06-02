---
title: FixMesh
summary: Uses the MeshFix tool to heal a mesh using a number of heuristics.
---


### Description

Uses the MeshFix tool to heal a mesh using a number of heuristics.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| inputMeshFile  | string  | yes      |         | Input mesh file name.                                                                    |
| outputMeshFile | string  | yes      |         | Fixed (output) mesh file name.                                                           |
| timeout        | number  | no       | 0       | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup). |
