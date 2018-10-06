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

| Tool                                       | Description                                                                                                 |
|--------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| [FBX2glTF](tools/FBX2glTF.md)              | Converts fbx to glTF (text or binary format).                                                               |
| [ImageMagick](tools/imageMagic.md)         | Swiss army knife for converting and processing images.                                                      |
| [InstantMeshes](tools/instantMeshes.md)    | Remeshing tool.                                                                                             |
| [Intermesh](tools/intermesh.md)            | Converts mesh files between various file formats. Optionally strips components such as normals and UVs.     |
| [MeshFix](tools/meshfix.md)                | Automatic fixing of mesh topology errors.                                                                   |
| [Meshlab](tools/meshlab.md)                | Swiss army knife for mesh processing, including manipulation, analysis, cleaning, and repair.               |
| [InstantUV/Mops CLI](tools/mops.md)        | Processing tool for creating web-ready 3D assets, including decimation,unwrapping, and texture map baking.  |
| [Autodesk Netfabb](tools/netfabb.md)       | Manufacturing software for creating 3D printable assets.                                                    |
| [Agisoft PhotoScan](tools/photoScan.md)    | Photogrammetry software.                                                                                    |
| [Reality Capture](tools/realityCapture.md) | Photogrammetry software.                                                                                    |
| [Unfold](tools/unfold.md)                  | Automatic generation of an unwrapped UV atlas for a low poly mesh.                                          |
| [Unknit](tools/unknit.md)                  | Automatic generation of an unwrapped UV atlas for a low poly mesh.                                          |
| [xNormal](tools/xNormal.md)                | Bakes texture maps such as normals and ambient occlusion.                                                   |
