import { DataSource } from 'typeorm';
import { inject, singleton } from 'tsyringe';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import { UserModel } from '@src/libs/common/database/users/User.model';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';

@singleton()
export class CustomDatabase extends DataSource {
    public constructor(
        @inject(CustomLogger) private readonly customLogger: CustomLogger
    ) {
        super({
            type: 'postgres',
            host: process.env.DATABASE_HOST,
            port: Number(process.env.DATABASE_PORT),
            username: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
            synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
            logging: process.env.DATABASE_LOGGING === 'true',
            entities: [UserModel, ReportModel]
        });
    }

    public async init() {
        try {
            await this.initialize();
            this.customLogger.log(LogLevel.INFO, 'Database is running');
        } catch (error) {
            this.customLogger.handleError(error, `Cannot start database`, true);
            process.exit(1);
        }
    }
}
