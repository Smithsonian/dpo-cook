# Command Line Interface

This page explains how to use the Cook processing service on the command line.

### Usage

Cook executes recipes. Each recipe is defined in a .json file and describes a
sequence of tasks to be executed. The recipe and its tasks can be controlled
by defining a number of parameters. The parameter names and their meaning depend
on the recipe. Each recipe comes with a set of default parameters, so you only
need to override the parameters you want to set to custom values.

The CLI takes the name or ID of an existing recipe, and the name of a parameter file.
Additionally, you can specify additional parameters on the command line. The default
parameters in the recipe are overridden by parameters in the parameter file, which
in turn are overridden by parameters specified on the command line.

```bash
Usage:
  cook <recipe> [parameter-file]  executes a recipe using the given (optional) parameter file
  --param=value                   overrides individual parameters in the parameter file
  -l, --list                      lists all available recipes
  -i, --info <recipe>             displays information about a recipe
  -h, --help                      displays this message
```

### Examples

```bash
cook web-ready --highPolyMeshFile=some_model.obj
```