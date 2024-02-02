---
title: "Recipe: clean"
summary: "Cleans a mesh of common issues"
weight: 110
---

The `clean` recipe fixes some common issues with unnecessary geometry in a mesh by removing unreferenced vertices, zero area faces, duplicate vertices, and duplicate faces.

It also has options for removing extraneous geometry components (often appearing as floating triangle clusters or unneeded reconstructions in photogrammetry results) by deleting everything but the largest component or, when doing turntable capture, deleting everything but the component central to the capture volume.