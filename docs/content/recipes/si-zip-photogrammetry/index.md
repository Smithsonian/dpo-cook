---
title: "Recipe: si-zip-photogrammetry"
summary: "Creates a mesh and texture from zipped capture image sets"
weight: 120
---

The `si-zip-photogrammetry` recipe is similar to the `photogrammetry` recipe but with some steps specific to the Smithsonian workflow. It takes folders of capture image sets (including alignment-only and masking images) as input and aligns the images, generates a mesh, cleans the mesh of unnecessary geometry, and finally generates a texture mapped to the cleaned mesh. This full photogrammetry pipeline currently works with Agisoft Metashape, with limited support for the RealityCapture and Meshroom applications.

Resulting meshes may require some manual cleanup or fixing dependent on the input and masking data available.