import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import { inject, singleton } from 'tsyringe';
import { DateService } from '@src/libs/date/Date.service';

@singleton()
export class CustomLogger {
    public constructor(
        @inject(DateService) private readonly date: DateService
    ) {}

    public listen() {
        process
            .on('uncaughtException', (err: Error | unknown) => {
                this.handleError(err, `Uncaught Exception:`, true);
            })
            .on('unhandledRejection', (err: Error | unknown) => {
                this.handleError(err, `Unhandled Rejection:`, true);
            });

        this.log(LogLevel.INFO, 'Logger started and listening for errors');
    }

    public log(level: LogLevel, message: string) {
        console.log(this.formatLog(level, message) + '\n');
    }

    private formatLog(level: LogLevel, message: string) {
        const timestamp =
            this.date.nowDate().toLocaleDateString() +
            ' | ' +
            this.date.nowDate().toLocaleTimeString();
        return `[\x1b[97m${timestamp}\x1b[0m] [${level}]\n${message}`;
    }

    private extractError(err: Error | unknown) {
        return err instanceof Error ? err.stack || err.message : err;
    }

    public handleError(
        error: Error | unknown,
        message: string,
        critical: boolean = false
    ) {
        this.log(
            critical ? LogLevel.ERROR : LogLevel.WARN,
            message + `\n` + this.extractError(error)
        );
    }
}
