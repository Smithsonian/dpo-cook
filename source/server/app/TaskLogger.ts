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

import * as fs from "fs";
import * as path from "path";
import * as moment from "moment";

import { TLogLevel } from "common/types";

////////////////////////////////////////////////////////////////////////////////

export { TLogLevel };

export interface ITaskLogEvent
{
    time: Date;
    module: string;
    level: TLogLevel;
    message: string;
    sender: string;
}

export default class TaskLogger
{
    protected logDir: string;

    protected logToConsole: boolean;
    protected logFileName: string;
    protected markerFileName: string;
    protected reportFileName: string;

    private logStream: fs.WriteStream;


    constructor(logDir: string)
    {
        this.logDir = logDir;

        this.logToConsole = true;
        this.logFileName = "";
        this.markerFileName = "";
        this.reportFileName = "";

        this.logStream = null;
    }

    logEvent(event: ITaskLogEvent)
    {
        if (!this.logToConsole && !this.logStream) {
            return;
        }

        const time = moment(event.time).format("YYYY-MM-DD HH:mm:ss");
        const level = (event.level.toUpperCase() + " ").substring(0, 5);
        const module = event.module[0].toUpperCase() + event.module.substring(1);
        const sender = event.sender ? `'${event.sender}' ` : "";

        const message = `${time} ${level} ${module} ${sender}${event.message}`;

        if (this.logToConsole) {
            if (event.level === "debug") {
                console.debug(message);
            }
            else if (event.level === "error") {
                console.error(message);
            }
            else {
                console.info(message);
            }
        }

        if (this.logStream) {
            this.logStream.write(message + "\n");
        }
    }

    taskDone(report: object, error?: Error): Promise<void>
    {
        this.writeReportFile(report);
        this.writeMarkerFile(error);

        this.enableConsoleLog(false);
        this.enableReportFile(false);
        this.enableMarkerFile(false);

        return this.enableLogFile(false);
    }

    enableConsoleLog(state: boolean)
    {
        this.logToConsole = state;
    }

    enableReportFile(reportFileName: string | false)
    {
        if (reportFileName) {
            this.reportFileName = reportFileName;
        }
        else {
            this.reportFileName = "";
        }
    }

    enableMarkerFile(markerFileName: string | false)
    {
        if (markerFileName) {
            this.markerFileName = markerFileName;
        }
        else {
            this.markerFileName = "";
        }
    }

    enableLogFile(logFileName: string | false): Promise<void>
    {
        return new Promise((resolve, reject) => {
            if (this.logStream) {
                this.logStream.end(() => {
                    this.createLogFile(logFileName);
                    resolve();
                });
            }
            else {
                this.createLogFile(logFileName);
                resolve();
            }
        });
    }

    protected createLogFile(logFileName: string | false)
    {
        if (logFileName) {
            this.logFileName = logFileName;
            const logFilePath = path.resolve(this.logDir, logFileName);
            this.logStream = fs.createWriteStream(logFilePath);
        }
        else {
            this.logFileName = "";
        }
    }

    protected writeReportFile(report: any)
    {
        if (!report) {
            console.warn("TaskLogger.writeReportFile - no report available to write.");
            return;
        }

        if (this.reportFileName) {
            const jsonReport = JSON.stringify(report);
            const reportFilePath = path.resolve(this.logDir, this.reportFileName);
            fs.writeFileSync(reportFilePath, jsonReport);
        }
    }

    protected writeMarkerFile(error?: Error)
    {
        if (this.markerFileName) {
            const mfp = path.resolve(this.logDir, this.markerFileName);
            const filePath = path.resolve(path.dirname(mfp), path.basename(mfp, path.extname(mfp)) + (error ? "_FAILURE" : "_SUCCESS") + path.extname(mfp));
            fs.writeFileSync(filePath, error ? JSON.stringify(error) : "");
        }
    }
}
