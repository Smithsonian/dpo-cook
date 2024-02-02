---
title: BatchConvertImage
summary: Converts folders of image files between different formats.
---


### Description

Converts image files between different formats.

Optionally clip the images to black or white.

Tool: [ImageMagick](../../tools/imageMagick)

### Options

| Option          | Type    | Required | Default | Description                                                                                                         |
|-----------------|---------|----------|---------|---------------------------------------------------------------------------------------------------------------------|
| inputImageFolder| string  | yes      |         | Input image folder name.                                                                                            |
| outputImageFolder | string  | yes      |         | Output image folder name.                                                                                         |
| quality         | number  | no       | 70      | Compression quality for JPEG images (0 - 100).                                                                      |
| filetype        | string  | no       | 'jpg'   | File type to convert images to.                                                                    		       |
| level           | number  | no       | none    | If provided, clips image to black (value < 128) or white (value > 128)                                              |