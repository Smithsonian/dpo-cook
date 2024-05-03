---
title: MergeMesh
summary: Merges a multi-mesh model file into one .obj and texture
---

### Description

Merges a multi-mesh model file into one .obj and texture.

Tool: [Blender](../../tools/blender)

### Options

| Option        | Type     | Required | Default            | Description                                                   |
|---------------|----------|----------|--------------------|---------------------------------------------------------------|
| inputMeshFile | string   | yes      |                    | Input mesh file name to merge.	                           |
| outputMeshFile | string  | yes      |                    | Output mesh file name.		                           |
| outputTextureFile | string  | yes   |                    | Output texture file name.		                           |
| timeout       | number   | no       | 0		   | Maximum task execution time in seconds 			   |