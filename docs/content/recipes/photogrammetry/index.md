---
title: "Recipe: photogrammetry"
summary: "Creates a mesh and texture from capture image set folders"
weight: 110
---

The `photogrammetry` recipe takes zip files of capture image sets (including alignment-only and masking images) and aligns the images, generates a mesh, cleans the mesh of unnecessary geometry, and finally generates a texture mapped to the cleaned mesh. This full photogrammetry pipeline currently works with Agisoft Metashape, with limited support for the RealityCapture and Meshroom applications.

Resulting meshes may require some manual cleanup or fixing dependent on the input and masking data available.