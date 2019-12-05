---
title: Writing recipes
summary: Learn how to write your own recipes.
weight: 150
---

In order to know what to do, the cook relies on recipes. A recipe is a JSON document describing a processing workflow, where a set of input files is processed by multiple tools. Recipes don't need to be linear: depending on the outcome of one processing step, a recipe can decide what to do next. If for example a task fails using tool A, it can decide to try again using tool B.

Recipes are controlled by a set of global parameters. Instead of entering the same information again and again for each tool to be executed, parameters are defined once and then automatically fed to each involved tool.

### JSON Schema

Global recipe parameters are defined using JSON Schema. When running a recipe, actual parameters are validated against the schema. Documentation for JSON Schema can be found here: https://json-schema.org/specification.html

### JSONata

Recipes make heavy use of JSONata expressions. Documentation for JSONata can be found here:
http://docs.jsonata.org/overview.html

### Examples

Example recipes can be found in `server/recipes`.  
A recipe template is available in `server/recipes-test/template.json`

### Recipe template structure

```json
{
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "template",
    "description": "Recipe Template",
    "version": "1",
    "start": "<name_of_first_step_to_be_executed>",

    "parameterSchema": {
        "type": "object",
        "properties": {
            "someFile": {
                "type": "string",
                "minLength": 1,
                "format": "file"
            }
        },
        "required": [
            "someFile"
        ],
        "additionalProperties": false
    },

    "steps": {
        "log": {
            "task": "Log",
            "description": "Enable logging services",
            "parameters": {
                "logToConsole": true,
                "reportFile": "$baseName(someFile) & '-report.json'"
            },
            "success": "'process'",
            "failure": "$failure"
        },
        "process": {
            "task": "Dummy",
            "description": "Dummy Task",
            "pre": {
            },
            "parameters": {
                "outcome": "success",
                "duration": 1
            },
            "post": {
            },
            "success": "'delivery'",
            "failure": "$failure"
        },
        "delivery": {
            "task": "Delivery",
            "description": "Send result files back to client",
            "pre": {
                "deliverables": {
                    "someFile": "someFile"
                }
            },
            "parameters": {
                "method": "none",
                "path": "$currentDir",
                "files": "deliverables"
            },
            "success": "$success",
            "failure": "$failure"
        }
    }
}
```
