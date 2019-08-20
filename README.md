# Smithsonian DPO Cook
3D Model/Geometry/Texture Processing Server.

### Important

This is alpha software under active development. Breaking changes can happen anytime, without prior notice.
You are welcome to experiment with the software, but please understand that we can't provide support at this time.

For questions, issues and bug reports, please open an issue on Github. 

### Introduction

Processing 3D meshes can be tedious. For tasks such as mesh decimation, creation of UV coordinates, map baking, and
file conversion, dozens of tools are available. There is currently no "one size fits all" solution. Often it takes a
lot of time and patience to find a chain of tools which work nicely together.

The Cook service simplifies the processing of 3D model, mesh, and texture data by providing a simplified
interface for about a dozen of the most widely used processing tools. Tools are abstracted into tasks. For example,
mesh decimation is available as a task with a unified set of parameters, regardless whether it is executed using
tool A or B.

The Cook executes on recipes. A recipe is a JSON document describing a processing workflow, where a set of files
is processed by multiple tools. Recipes offer "intelligent branching": depending on the outcome of one tool, it
can decide what to do next. If a recipe fails on a task using tool A, it can simply decide to try again using tool B.

Recipes are controlled by a set of global parameters. Instead of entering the same information again and again
for each tool to be executed, parameters are defined once and then automatically fed to each involved tool.

### Web API, web UI and CLI

Currently, the Cook can be operated in three ways:

- Restful web API
- Web-based user interface
- Remote command line interface

The remote CLI is no longer part of this repository. You can find it here: https://github.com/Smithsonian/dpo-cook-cli.git

### Documentation

This project, including its documentation, is under active development.

- [Documentation Home](https://smithsonian.github.io/dpo-cook)
