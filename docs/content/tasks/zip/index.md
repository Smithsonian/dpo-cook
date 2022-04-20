---
title: Zip
summary: Zip files to archive.
---

### Description

Zips multiple files to a single archive.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| inputFile1     | string  | yes      |         | Input file 1.                              |
| inputFile2     | string  | no       |         | Input file 2.                                               |
| inputFile3     | string  | no       |         | Input file 3.                              |
| inputFile4     | string  | no       |         | Input file 4.                |
| inputFile4     | string  | no       |         | Input file 5.                |
| outputFile     | string  | no       | "CookArchive.zip" | Name of the resulting archive file.                |
| compressionLevel | integer | no       |    5     | Specifies the compression level of the archive. 0 == No compression, 10 == Max        |
| timeout 	 | string  | no       |    0     | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup). |
| tool 		 | string  | no       | "SevenZip" | Tool to use for zipping.                |