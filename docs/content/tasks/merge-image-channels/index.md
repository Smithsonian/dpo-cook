---
title: MergeImageChannels
summary: Combines channels from separate maps into one combined map.
---

### Description

This task merges channels from separate images into one, useful when required by certain formats like glTF. Ex: merging an alpha map with diffuse texture or merging roughness, metalness, and ambient occlusion maps.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| redChannelMapFile | string  | yes      |         | Map input file to pull red channel from.                              |
| greenChannelMapFile | string  | yes  |         | Map input file to pull green channel from.                          |
| blueChannelMapFile 	 | string  | yes       |         | Map input file to pull blue channel from.                              |
| alphaChannelMapFile 	 | string  | yes       |         | Map input file to pull alpha channel from.                              |
| outputMapFile 	 | string  | yes       |         | Combined map output file.                              |
| timeout	| number | no | 0 | Maximum task execution time in seconds |