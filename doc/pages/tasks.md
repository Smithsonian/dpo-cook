# Tasks

#### High Level, Logging

| Task                          | Description                                                                                                                                                                                                                                               |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Recipe](tasks/recipe.md)     | Executes a recipe as a sequence of tasks. Execution order depends on success or failure of each task.Task execution is fully parameterized. Each recipe provides a global set of parameters that can be usedto control and orchestrate the various tasks. |
| [Pipeline](tasks/pipeline.md) | Executes a linear sequence of tasks.                                                                                                                                                                                                                      |
| [Log](tasks/log.md)           | Provides logging facilities (log to console, log to file, write report to file).                                                                                                                                                                          |

#### File Operations

| Task                                    | Description                                                                                       |
|-----------------------------------------|---------------------------------------------------------------------------------------------------|
| [FileCopy](tasks/fileCopy.md)           | Generic file copy.                                                                                |
| [FileOperation](tasks/fileOperation.md) | Provides operations for renaming and deleting files, and creating, renaming and deleting folders. |
| [Pickup](tasks/pickup.md)               | Copies files from a local client directory to the processing server's work directory.             |
| [Delivery](tasks/delivery.md)           | Copies files from the processing server's work directory to a local client directory.             |

#### Photogrammetry

| Task                                      | Description                                                                                      |
|-------------------------------------------|--------------------------------------------------------------------------------------------------|
| [Reconstruction](tasks/reconstruction.md) | Uses RealityCapture photogrammetry software to create a 3D model from a set of 2D images.        |

#### Mesh Processing

| Task                                  | Description                                                                                                                 |
|---------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| [CleanupMesh](tasks/cleanupMesh.md)   | Mesh cleaning and healing, such as removing unreferenced vertices.                                                          |
| [ConvertMesh](tasks/convertMesh.md)   | Converts mesh files to various file formats. Optionally strips components such as normals and UVs.                          |
| [DecimateMesh](tasks/decimateMesh.md) | Reduces the size of a mesh to a target number of faces or vertices.                                                         |
| [FixMesh](tasks/fixMesh.md)           | Fixes mesh deficiencies such as flipped triangles.                                                                          |
| [Remesh](tasks/remesh.md)             | Creates a new, regular mesh for an object.                                                                                  |
| [UnwrapMesh](tasks/unwrapMesh.md)     | Creates a UV atlas for a mesh. Internally works with Rizom Labs Unfold, Uknit (hosted on 3ds Max),and InstantUV (Mops CLI). |

#### Mesh Analysis

| Task                                | Description                                                                         |
|-------------------------------------|-------------------------------------------------------------------------------------|
| [InspectMesh](tasks/inspectMesh.md) | Provides mesh analysis (manifoldness, watertight, dimensions, center, volume, etc.) |

#### Texture Generation

| Task                          | Description                                                                                                      |
|-------------------------------|------------------------------------------------------------------------------------------------------------------|
| [BakeMaps](tasks/bakeMaps.md) | Bakes various features to textures by projecting them from a high poly mesh onto the UV spaceof a low poly mesh. |

#### Image Processing

| Task                                          | Description                                                                        |
|-----------------------------------------------|------------------------------------------------------------------------------------|
| [ConvertImage](tasks/convertImage.md)         | Convert images to various file formats using ImageMagick.                          |
| [CombineOcclusion](tasks/combineOcclusion.md) | Combines three occlusion maps into one RGB map using red, green and blue channels. |

#### Image Analysis

No tasks available yet.