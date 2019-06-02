---
title: CombineOcclusion
summary: Combines 3 separate occlusion maps into one RGB texture.
---

### Description

Combines 3 separate occlusion maps into one combined map.
Applies individual gamma correction to each of the 3 map channels.
- Large scale map > red channel.
- Medium scale map > green channel.
- Small scale map > blue channel.

Tool: [ImageMagick](../tools/imageMagick.md)

### Options

| Option        | Type     | Required | Default            | Description                                                   |
|---------------|----------|----------|--------------------|---------------------------------------------------------------|
| largeMapFile  | string   | yes      |                    | Large scale occlusion map input file.                         |
| mediumMapFile | string   | yes      |                    | Medium scale occlusion map input file.                        |
| smallMapFile  | string   | yes      |                    | Small scale occlusion map input file.                         |
| outputMapFile | string   | yes      |                    | Combined occlusion map output file.                           |
| channelGamma  | number[] | no       | [ 1.0, 0.1, 0.05 ] | Gamma correction values for large, medium and small channels. |