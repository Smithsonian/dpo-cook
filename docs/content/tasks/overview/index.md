---
title: Overview
summary: List of available recipe tasks grouped by category.
weight: 100
---

### Tasks by Category

#### High Level, Logging

| Task                          | Description                                                                                                                                                                                                                                               |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Recipe](../recipe)     | Executes a recipe as a sequence of tasks. Execution order depends on success or failure of each task.Task execution is fully parameterized. Each recipe provides a global set of parameters that can be usedto control and orchestrate the various tasks. |
| [Pipeline](../pipeline) | Executes a linear sequence of tasks.                                                                                                                                                                                                                      |
| [Log](../log)           | Provides logging facilities (log to console, log to file, write report to file).                                                                                                                                                                          |

#### File Operations

| Task                                    | Description                                                                                       |
|-----------------------------------------|---------------------------------------------------------------------------------------------------|
| [FileCopy](../file-copy)           | Generic file copy.                                                                                |
| [FileOperation](../file-operation) | Provides operations for renaming and deleting files, and creating, renaming and deleting folders. |
| [Pickup](../pickup)               | Copies files from a local client directory to the processing server's work directory.             |
| [Delivery](../delivery)           | Copies files from the processing server's work directory to a local client directory.             |

#### Photogrammetry

| Task                                      | Description                                                                                      |
|-------------------------------------------|--------------------------------------------------------------------------------------------------|
| [Reconstruction](../reconstruction) | Uses RealityCapture photogrammetry software to create a 3D model from a set of 2D images.        |

#### Mesh Processing

| Task                                  | Description                                                                                                                 |
|---------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| [CleanupMesh](../cleanup-mesh)   | Mesh cleaning and healing, such as removing unreferenced vertices.                                                          |
| [ConvertMesh](../convert-mesh)   | Converts mesh files to various file formats. Optionally strips components such as normals and UVs.                          |
| [DecimateMesh](../decimate-mesh) | Reduces the size of a mesh to a target number of faces or vertices.                                                         |
| [FixMesh](../fix-mesh)           | Fixes mesh deficiencies such as flipped triangles.                                                                          |
| [Remesh](../remesh)             | Creates a new, regular mesh for an object.                                                                                  |
| [UnwrapMesh](../unwrap-mesh)     | Creates a UV atlas for a mesh. Internally works with Rizom Labs Unfold, Uknit (hosted on 3ds Max),and InstantUV (Mops CLI). |

#### Mesh Analysis

| Task                                | Description                                                                         |
|-------------------------------------|-------------------------------------------------------------------------------------|
| [InspectMesh](../inspect-mesh) | Provides mesh analysis (manifoldness, watertight, dimensions, center, volume, etc.) |

#### Texture Generation

| Task                          | Description                                                                                                      |
|-------------------------------|------------------------------------------------------------------------------------------------------------------|
| [BakeMaps](../bake-maps) | Bakes various features to textures by projecting them from a high poly mesh onto the UV spaceof a low poly mesh. |

#### Image Processing

| Task                                          | Description                                                                        |
|-----------------------------------------------|------------------------------------------------------------------------------------|
| [ConvertImage](../convert-image)         | Convert images to various file formats using ImageMagick.                          |
| [CombineOcclusion](../combine-occlusion) | Combines three occlusion maps into one RGB map using red, green and blue channels. |

#### Image Analysis

No tasks available yet.