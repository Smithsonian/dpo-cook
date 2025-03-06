---
title: ProcessRaw
summary: Converts raw images to jpg and pre-processes for photogrammetry pipeline
---


### Description

Converts raw images to jpg and white balances/color corrects based on provided parameters.

Tools: [RawTherapee](../../tools/rawtherapee)

### Options

| Option               | Type    | Required | Default   | Description                                                                                  |
|----------------------|---------|----------|-----------|----------------------------------------------------------------------------------------------|
| inputImageFolder     | string  | yes      |           | Input image folder zip file.                                                                 |
| outputImageFolder     | string  | no      |           | Location for output files                                                      |
| wbTemperature      | integer  | no       |           | Temperature value used for white balancing              |
| wbTint           | number  | no       | 	        | Tint value used for white balancing		       |
| exposureComp          | number  | no       | 	        | Value used for exposure compensation (-5 to 12)                  |
| sharpeningEnabled         | boolean  | no       | 	        | Flag to enable/disable sharpening        |
| lensProfile      | string | no       | false     | Path to independent lens correction profile file (LCP)        |
| timeout              | number  | no       | 0         | Maximum task execution time in seconds (default: 0, uses timeout defined in tool setup).     |
| tool                 | string  | no       | "RawTherapee" | Tool to use for processing raw images: "RawTherapee".                  |