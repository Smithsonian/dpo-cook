---
title: WebAsset
summary: Generates gltf and glb web assets.
---

### Description

This task combines mesh and map data into a GLTF web asset. The asset can be written in JSON or binary format, with optionally embedded maps and DRACO-compressed mesh data.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| outputFile 	 | string  | yes      |         | File name of the resulting web asset.                              |
| meshFile 	 | string  | yes  |         | File name of the input mesh to be added to the web asset.                          |
| diffuseMapFile 	 | string  | no       |         | File name of the diffuse map to be added to the web asset.                      |
| occlusionMapFile 	 | string  | no       |         | File name of the occlusion map to be added to the web asset.                    |
| emissiveMapFile 	 | string  | no       |         | File name of the emissive map to be added to the web asset.   |
| metallicRoughnessMapFile	| string | no |  | File name of the metallic-roughness map to be added to the web asset. |
| normalMapFile 	 | string  | no       |         | File name of the normal map to be added to the web asset.    |
| zoneMapFile 	 | string  | no       |         | File name of the zone map to be added to the web asset.   |
| metallicFactor 	 | number  | no       | 0.0        | The metalness factor for the PBR material.    |
| roughnessFactor 	 | number  | no       | 0.6      | The roughness factor for the PBR material.  |
| alignCenter 	 | boolean  | no       | false        | Centers object if true, i.e. aligns object with origin.   |
| alignFloor 	 | boolean  | no       | false         | Centers object and aligns it with y-origin if true.  |
| objectSpaceNormals 	 | boolean  | no       | false         | True to use object space normals, false for tangent space normals.  |
| useCompression 	 | boolean  | no       | false         | True if geometry should be compressed using the DRACO mesh compressor. |
| compressionLevel 	 | integer  | no       | 10        | Compression level for DRACO mesh compression, range 0 - 10.   |
| embedMaps 	 | boolean  | no       | false         | True if map data should be embedded in the asset file, false if maps are embedded by reference only.  |
| writeBinary 	 | boolean  | no       | false         | True if the asset should be written in binary format (.glb), false for a text .gltf file.   |
| alphaBlend 	 | boolean  | no       | false         | True if the asset should interpret alpha channel data as opacity. |
| tool 	 	 | string  | no       | "Blender"        | Tool to use for generating web assets ("MeshSmith" or "Blender").  |

