---
title: CombineMesh
summary: Combines two meshes into a single self contained .fbx
---

### Description

Combines two meshes into a single self contained .fbx.

Tool: [Blender](../../tools/blender)

### Options

| Option        | Type     | Required | Default            | Description                                                   |
|---------------|----------|----------|--------------------|---------------------------------------------------------------|
| baseMeshFile  | string   | yes      |                    | Base mesh file name.                         		   |
| inputMeshFile | string   | yes      |                    | Input mesh file name to combine with base.                    |
| inputMeshBasename  | string   | yes |                    | Name used for merged input mesh                  		   |
| outputMeshFile | string  | yes      |                    | Output mesh file name.		                           |
| timeout       | number   | no       | 0		   | Maximum task execution time in seconds 			   |