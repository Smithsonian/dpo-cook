---
title: SyncObjMtl
summary: Ensures a mtl file exists and the obj references it correctly.
---

### Description

This task is specific to .obj geometry files that store material information in a separate .mtl file. 

These .mtl files can become lost or incorrectly named. This task runs a script find the .mtl (and generate if needed) and correctly link it in the .obj.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| objFile	 | string  | yes      |         | Name of input obj file.                              |
| mtlFile 	 | string  | yes      |         | Name of .mtl file to sync.                          |
| textureFile 	 | string  | yes      |         | Name of texture file to be referenced in the .mtl |
| timeout 	 | number  | no       |   0     | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup).  |
| tool 		 | string  | no       | "Cscript" | Tool to use for standardizing.                              |