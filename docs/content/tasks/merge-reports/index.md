---
title: MergeReports
summary: Merge two mesh inspection reports
---

### Description

Different applications supported by inspection tasks have different quality output. This task allows you to merge the best quality mesh
data from one report with the best quality material data from another to create an optimal inspect report.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| meshReportFile | string  | yes      |         | Inspection report file to pull mesh data from                              |
| materialReportFile | string  | yes  |         | Inspection report file to pull material data from                          |
| reportFile 	 | string  | no       |         | Name of merged report                              |