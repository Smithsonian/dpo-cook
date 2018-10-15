/**
 * 3D Foundation Project
 * Copyright 2018 Smithsonian Institution
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Job from "../app/Job";

import Task, { ITaskParameters } from "../app/Task";

////////////////////////////////////////////////////////////////////////////////

/** Parameters for [[LogTask]]. */
export interface ILogTaskParameters extends ITaskParameters
{
    /** Writes log messages to the console if true (default: true). */
    logToConsole?: boolean;
    /** Writes log messages to the given log file. */
    logFile?: string;
    /** Writes a detailed, JSON-formatted report to the given file. */
    reportFile?: string;
    /** Writes a marker file after job completion, indicating success or failure. */
    markerFile?: string;
}

/**
 * Provides logging facilities (log to console, log to file, write report to file).
 *
 * Log files can't be delivered to the client using the delivery task since they are
 * incomplete at the time the delivery task runs.
 *
 * Parameters: [[ILogTaskParameters]]
 */
export default class LogTask extends Task
{
    static readonly description = "Provides logging facilities (log to console, log to file, write report to file).";

    static readonly parameterSchema = {
        type: "object",
        properties: {
            logToConsole: {
                type: "boolean",
                default: true
            },
            logFile: {
                type: "string"
            },
            reportFile: {
                type: "string"
            },
            markerFile: {
                type: "string"
            }
        }
    };

    static readonly parameterValidator =
        Task.jsonValidator.compile(LogTask.parameterSchema);

    constructor(options: ILogTaskParameters, context: Job)
    {
        super(options, context);
    }

    run(): Promise<void>
    {
        this.startTask();
        const options = this.parameters as ILogTaskParameters;
        const logger = this.context.logger;

        logger.enableConsoleLog(options.logToConsole);
        logger.enableLogFile(options.logFile);
        logger.enableReportFile(options.reportFile);
        logger.enableMarkerFile(options.markerFile);

        // mention output files in report result, so they can be picked up later
        const files = this.report.result.files = {};
        if (options.logFile) {
            files["log"] = options.logFile;
        }
        if (options.reportFile) {
            files["report"] = options.reportFile;
        }
        if (options.markerFile) {
            files["marker"] = options.markerFile;
        }

        this.endTask(null, "done");
        return Promise.resolve();
    }
}