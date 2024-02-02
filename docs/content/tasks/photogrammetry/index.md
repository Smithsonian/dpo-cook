---
title: Photogrammetry
summary: Generates a mesh and texture from zipped image sets using photogrammetry techniques.
---


### Description

Generates a mesh and texture from zipped image sets using photogrammetry techniques. It includes options for masking image sets and alignment-only images.

Tools: [Metashape](../../tools/metashape), 
With limited support by: [RealityCapture](../../tools/reality-capture), [Meshroom](../../tools/meshroom)

### Options

| Option               | Type    | Required | Default   | Description                                                                                  |
|----------------------|---------|----------|-----------|----------------------------------------------------------------------------------------------|
| inputImageFolder     | string  | yes      |           | Input image folder zip file.                                                                 |
| alignImageFolder     | string  | yes      |           | Metashape only: Alignment image folder.                                                      |
| maskImageFolder      | string  | no       |           | Metashape only: Mask image folder.                                                           |
| outputFile           | string  | no       | 	        | Base name used for output files.                       				       |
| camerasFile          | string  | no       | 	        | Metashape only: Name used for saved camera position file.                                    |
| scalebarFile         | string  | no       | 	        | CSV file with scalebar markers and distances. ([Example scalebar file](./scalebar-defs.csv))          				       |
| optimizeMarkers      | boolean | no       | false     | Metashape only: Flag to enable discarding high-error markers.                 	       |
| alignmentLimit       | number  | no       | 50        | Metashape only: Percent success required to pass alignment stage.                            |
| tiepointLimit        | integer | no       | 25000     | Metashape only: Max number of tiepoints. 						       |
| keypointLimit        | integer | no       | 75000     | Metashape only: Max number of keypoints. 						       |
| turntableGroups      | boolean | no       | false     | Metashape only: Flag to process images as SI-formatted turntable groups. 		       |
| depthMaxNeighbors    | integer | no       | 16        | Metashape only: Max neighbors value to use for depth map generation. 			       |
| genericPreselection  | boolean | no       | true      | Metashape only: Flag = true to use generic preselection. 				       |
| meshQuality          | string  | no       | "High"    | Metashape only: Preset for mesh quality ("Low", "Medium", "High", "Highest", "Custom").      |
| customFaceCount      | integer | no       | 3000000   | Metashape only: If meshQuality is custom, this defines the goal face count.      	       |
| depthMapQuality      | string  | no       | "Highest" | Metashape only: Preset for depth map quality ("Low", "Medium", "High", "Highest"). 	       |
| maskMode             | string  | no       | "File"    | Metashape only: Desired masking operation. "File" assumes provided image is the mask, "Background" uses the background of the image as a basis for 'smart' masking. |
| timeout              | number  | no       | 0         | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup).     |
| tool                 | string  | no       | "Metashape" | Tool to use for decimation: "Metashape", "RealityCapture", or "Meshroom".                  |