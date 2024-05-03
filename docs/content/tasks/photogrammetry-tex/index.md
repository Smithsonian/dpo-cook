---
title: PhotogrammetryTex
summary: Uses photogrammetry capture images to project a texture onto existing geometry. 
---


### Description

Uses photogrammetry capture images to project a texture onto existing geometry using saved camera positions from a previous photogrammetry process.

Tools: [Metashape](../../tools/metashape)  (** Planned implementations for RealityCapture and Meshroom **)

### Options

| Option               | Type    | Required | Default   | Description                                                                                  |
|----------------------|---------|----------|-----------|----------------------------------------------------------------------------------------------|
| inputImageFolder     | string  | yes      |           | Input image folder zip file.                                                                 |
| inputModelFile       | string  | yes      |           | Metashape only: Alignment image folder.                                                      |
| outputFile           | string  | yes      | 	        | Base name used for output files.                       				       |
| camerasFile          | string  | yes      | 	        | Name used for saved camera position file.                                    |
| scalebarFile         | string  | no       | 	        | CSV file with scalebar markers and distances.  ([Example scalebar file](./scalebar-defs.csv))          				       |
| timeout              | number  | no       | 0         | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup).     |
| tool                 | string  | no       | "Metashape" | Tool to use for decimation: "Metashape", "RealityCapture", or "Meshroom".                  |