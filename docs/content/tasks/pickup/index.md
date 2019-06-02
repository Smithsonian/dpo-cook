---
title: Pickup
summary: Grabs input files from the client.
weight: 110
---


### Description

Picks files from a given location and copies them into the current work directory.
Method "local" supports local file copy.
 
### Options

| Option | Type     | Required | Default | Description                                                      |
|--------|----------|----------|---------|------------------------------------------------------------------|
| method | string   | yes      | -       | Transport method to be used. "local" uses the local file system. |
| path   | string   | yes      | -       | Path where the source files can be found.                        |
| files  | object   | no       | -       | Names of files to be copied.                                     |