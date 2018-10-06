# Task: Delivery

### Description

Delivers files to a given destination. Copies the files from the current work directory.
Method "local" supports local file copy.

### Options

| Option | Type   | Required | Default | Description                                                      |
|--------|--------|----------|---------|------------------------------------------------------------------|
| method | string | yes      |         | Transport method to be used. "local" uses the local file system. |
| path   | string | yes      |         | Path where the files should be copied to.                        |
| -      | string | no       | -       | Names of files to be copied.                                     |