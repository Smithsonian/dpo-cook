---
title: GenerateUSDZ
summary: Convert a glb into a USDZ
---

### Description

USDZ is still an emerging format so we currently have a special task to generate it from a self-contained glb package. 

**Note:** If using Blender for this task, you must also have the [Zip task](../zip) functional to turn USD to USDZ.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| sourceFile 	 | string  | yes      |         | Name of input file.                              |
| outputFile 	 | string  | yes      |         | Name of output file.                          |
| scale	 	 | number  | no       |  100    | Uniform scale to apply during conversion. |
| timeout 	 | number  | no       |   0     | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup).  |
| tool 		 | string  | no       | "Blender" | Tool to use for USDZ conversion.                              |