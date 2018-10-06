# Task: ConvertImage

### Description

Converts image files between different formats.
Applies scaling and gamma correction during conversion.

Tool: [ImageMagick](../tools/imageMagick.md)

### Options

| Option        | Type    | Required | Default | Description                                                                                                         |
|---------------|---------|----------|---------|---------------------------------------------------------------------------------------------------------------------|
| inputMapFile  | string  | yes      |         | Input image file name.                                                                                              |
| outputMapFile | string  | yes      |         | Output image file name.                                                                                             |
| quality       | number  | no       | 70      | Compression quality for JPEG images (0 - 100).                                                                      |
| normalize     | boolean | no       | false   | Automatic stretching of the final image if true.                                                                    |
| gamma         | number  | no       | 1.0     | Applies gamma correction to the final image if set (1.0 = unchanged).                                               |
| resize        | number  | no       | -       | Scales the image to the given size if set. Values <= 2 represent relative scale, otherwise absolute size in pixels. |