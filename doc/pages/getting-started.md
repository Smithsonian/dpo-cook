# Getting Started

## Prerequisites

### Hardware

Hardware requirements depend on the tools you plan to run via cook service. Some of the tools may need a lot of RAM
while others rely on a strong CPU or use GPU (graphics card) based processing.

We have tested the cook service and our standard tool suite on the following configuration:

- Intel Xeon or Core i7 processor
- 32 GB RAM
- NVIDIA GeForce GTX 1080

### Software

#### Operating System

Cook has been tested with the following operating systems:

- Windows 10 Professional
- Windows Server 2012 R2 Standard 

#### Applications

Before installing Cook Server, you need to install the following applications on your machine:

- Git: https://git-scm.com
- Node: https://nodejs.org

Depending on your needs, you also need to install the tools you want to use for processing. These tools are currently supported:

- Meshlab: http://www.meshlab.net
- Meshfix: https://github.com/MarcoAttene/MeshFix-V2.1
- RizomUV Virtual Spaces: https://www.rizom-lab.com/products/rizomuv-vs
- XNormal: http://www.xnormal.net
- InstantUV Mops CLI: https://www.instantuv.org
- ImageMagick: https://www.imagemagick.org
- MeshSmith: (following soon)
- InstantMeshes: https://github.com/wjakob/instant-meshes
- FBX2glTF: https://github.com/facebookincubator/FBX2glTF

## Installing Cook Server

### Cloning the Github project

1. Navigate to a folder of your choice
2. Open a terminal window (shift-right click and select "open command window here")
3. Enter `git clone --recurse-submodules https://github.com/Smithsonian/dpo-cook`
4. Navigate into the new folder; enter `cd dpo-cook`
5. Enter `npm install`
6. Enter `npm run build`

### Configuration

In the `server` subfolder, you find templates for the 3 required configuration files. Copy and rename the template, then
edit it to your needs. For example:

```bash
copy tools.template.json tools.json
notepad.exe tools.json
```

Do this for each of the 3 template files. You should end up with 3 configuration files,
`server.json`, `tools.json`, and `clients.json`

##### server.json

Server configuration (directories, port, etc.)

##### tools.json

Information about processing tools: path to the executable, version, timeout in seconds and the maximum number
of instances this tool can run simultaneously.

##### clients.json

IDs and names for the clients you want to grant access to the server.

## Running Cook Server

### Start in server mode

Enter `npm run server`

### Start from the command line (CLI mode)

See [Cook CLI](./cli.md)