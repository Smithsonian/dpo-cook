---
title: Overview
summary: 3rd party tool installation and configuration.
weight: 100
---

# Tools

## Configuration

Each processing server needs a configuration file where the path to the executables and version information for all
installed tools are defined. A template configuration file is provided for convenience.

First, copy the template file:
    
    cp server/tools.template.json server/tools.json
    
Then edit the entries in the `tools.json` file. The timeout specifies the maximum execution
time allowed for this tool. Change this if you are on a particularly slow or fast machine.
Each entry should look like so:

    "Unfold": {
      "executable": "C:\\Program Files\\Rizom Lab\\Unfold3D VS RS 2017.0\\unfold3d.exe",
      "version": "2017.0.27.g2c0aab2",
      "timeout": 1200 // 20 minutes
    },

You are allowed to use comments in the .json file.
 
 Please make sure backslashes are escaped using another backslash: `\\`

## Supported tools

| Tool                                  | Description                                                                                                 |
|---------------------------------------|-------------------------------------------------------------------------------------------------------------|
| [ImageMagick](../image-magick)        | Swiss army knife for converting and processing images.                                                      |
| [InstantMeshes](../instant-meshes)    | Remeshing tool.                                                                                             |
| [MeshFix](../meshfix)                 | Automatic fixing of mesh topology errors.                                                                   |
| [Meshlab](../meshlab)                 | Swiss army knife for mesh processing, including manipulation, analysis, cleaning, and repair.               |
| [MeshSmith](../meshsmith)             | Converts mesh files between various file formats. Optionally strips components such as normals and UVs.     |
| [RapidCompact](../rapid-compact)      | Processing tool for creating web-ready 3D assets, including decimation,unwrapping, and texture map baking.  |
| [RizomUV](../rizom-uv)                | Automatic generation of an unwrapped UV atlas for a low poly mesh.                                          |
| [xNormal](../xnormal)                 | Bakes texture maps such as normals and ambient occlusion.                                                   |
