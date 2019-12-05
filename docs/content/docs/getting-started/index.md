---
title: Getting Started
summary: Prerequisites, installation and configuration.
weight: 100
---

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

Cook has been tested with the following versions of Microsoft Windows. We currently don't support any other operating systems, because some of the 3rd party processing tools are only available for Windows.

- Windows 10 Professional
- Windows Server 2012 R2 Standard 

##### Running Cook in a VM

It is currently not advised to run Cook in a virtual machine. Some 3rd party tools have specific hardware requirements, e.g. some need direct access to the GPU. Also, performance may suffer.

#### Applications

Before installing Cook Server, you need to install the following applications:

- Git: https://git-scm.com
- Node: https://nodejs.org

Depending on your needs, you also need to install the tools you want to use for processing. These tools are currently supported:

- [ImageMagick](../../tools/image-magick)
- [Instant Meshes](../../tools/instant-meshes)
- [Meshfix](../../tools/meshfix)
- [Meshlab](../../tools/meshlab)
- [MeshSmith](../../tools/meshsmith)
- [RapidCompact](../../tools/rapid-compact)
- [RizomUV](../../tools/rizom-uv)
- [XNormal](../../tools/xnormal)

Support for the following tools is planned, but hasn't been completed yet.

- [Blender](../../tools/blender)
- [Reality Capture](../../tools/reality-capture)

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

Information about processing tools: path to the executable, version, timeout in seconds and the maximum number of instances this tool can run simultaneously.

Please have a look at the tool documentation pages to see a configuration example for each tool.

##### clients.json

IDs and names for the clients you want to grant access to the server.

## Running Cook Server

### Starting Cook as a service using PM2

- To start the service, enter `npm run start`
- To stop the service, enter `npm run stop`

### Running Cook as a foreground application

Enter `npm run server`

### Starting Cook in development mode (rebuilds on file changes)

Enter `npm run watch`
