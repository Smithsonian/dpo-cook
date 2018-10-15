# Task: FileOperation

### Description

### Options

| Option     | Type   | Required | Default | Description                                                                            |
|------------|--------|----------|---------|----------------------------------------------------------------------------------------|
| operation  | string | yes      | -       | Operation to be performed: "DeleteFile", "RenameFile", "CreateFolder", "DeleteFolder". |
| name       | string | yes      | -       | Name of the file the operation should be performed on.                                 |
| newName    | string | no       | -       | For "RenameFile" only: new file name.                                                  |