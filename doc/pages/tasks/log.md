# Task: Log

### Description

Provides logging facilities (log to console, log to file, write report to file).

Log files can't be delivered to the client using the delivery task since they are
incomplete at the time the delivery task runs.

### Options

| Option         | Type    | Required | Default | Description                                                                              |
|----------------|---------|----------|---------|------------------------------------------------------------------------------------------|
| logToConsole   | string  | no       | true    | Writes log messages to the console if true (default: true).                              |
| logFile        | string  | no       |         | Writes log messages to the given log file.                                               |
| reportFile     | string  | no       |         | Writes a detailed, JSON-formatted report to the given file.                              |
| markerFile     | string  | no       |         | Writes a marker file after job completion, indicating success or failure.                |