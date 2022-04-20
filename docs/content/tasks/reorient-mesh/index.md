---
title: ReorientMesh
summary: Standardize mesh scale and orientation
---

### Description

Models, especially from scan data, can be in all different scales and orientations. This task leverages the manual QC work done with an [SI Voyager scene file](https://smithsonian.github.io/dpo-voyager/document/overview/)
by scaling and aligning relative to it. This can be helpful to ensure all public facing assets are consistent.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| inputMeshFile	 | string  | yes      |         | Name of input mesh file.                              |
| inputVoyagerFile | string  | yes    |         | Name of input Voyager SVX file.                          |
| outputMeshFile | string  | no       |         | Name of output mesh file. |
| scaleToMeters  | boolean | no       |  false  | Flag to indicate if the model should be scaled to meters. |
| timeout 	 | number  | no       |   0     | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup).  |
| tool 		 | string  | no       | "Blender" | Tool to use for standardizing.                              |