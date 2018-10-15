# Recipes

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