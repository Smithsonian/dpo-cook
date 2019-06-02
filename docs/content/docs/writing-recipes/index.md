---
title: Writing recipes
summary: Learn how to write your own recipes.
weight: 150
---

In order to know what to do, the cook needs recipes. A recipe is a JSON document describing a processing workflow, where a set of input files is processed by multiple tools. Recipes offer “intelligent branching”: depending on the outcome of one processing step, it can decide what to do next. If a recipe fails on a task using tool A, it can for example decide to try again using tool B.

Recipes are controlled by a set of global parameters. Instead of entering the same information again and again for each tool to be executed, parameters are defined once and then automatically fed to each involved tool.

### Introduction

Coming soon.

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
            },
            "pickupPath": {
                "type": "string",
                "minLength": 1
            },
            "deliveryPath": {
                "type": "string",
                "minLength": 1
            },
            "transportMethod": {
                "type": "string",
                "enum": [
                    "none",
                    "local"
                ],
                "default": "none"
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
            "success": "'pickup'",
            "failure": "$failure"
        },
        "pickup": {
            "task": "Pickup",
            "description": "Fetch input files from client",
            "parameters": {
                "method": "transportMethod",
                "path": "$firstTrue(pickupPath, $currentDir)",
                "files": {
                    "someFile": "someFile"
                }
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
                "method": "transportMethod",
                "path": "$firstTrue(deliveryPath, pickupPath, $currentDir)",
                "files": "deliverables"
            },
            "success": "$success",
            "failure": "$failure"
        }
    }
}
```

### How to write a recipe

Coming soon.