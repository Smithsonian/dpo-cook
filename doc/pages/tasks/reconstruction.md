# Task: Reconstruction

### Description

Uses RealityCapture photogrammetry software to create a 3D model from a set of 2D images.

Tools: [RealityCapture](../tools/realityCapture.md)

### Options

| Option                | Type    | Required | Default   | Description                                                                              |
|-----------------------|---------|----------|-----------|------------------------------------------------------------------------------------------|
| inputImageFolderName  | string  | yes      |           | Folder name with 2D images to be used for reconstruction.                                |
| timeout               | number  | no       | 0         | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup). |
