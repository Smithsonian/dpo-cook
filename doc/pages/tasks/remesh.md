# Task: Remesh

### Description

Generates a new, regular mesh for an object.

### Options

| Option         | Type   | Required | Default | Description                              |
|----------------|--------|----------|---------|------------------------------------------|
| inputMeshFile  | string | yes      |         | Input mesh file name.                    |
| outputMeshFile | string | yes      |         | Remeshed (output) mesh file name.        |
| numFaces       | number | yes      |         | Target number of faces for the new mesh. |
| timeout        | number | no       | 0       | Maximum task execution time in seconds.  |