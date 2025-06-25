import { Client } from 'discordx';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { inject, singleton } from 'tsyringe';
import { importx } from '@discordx/importer';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import { CustomDatabase } from '@src/libs/common/database/Database';

@singleton()
export class CustomClient extends Client {
    public constructor(
        @inject(CustomLogger) private readonly customLogger: CustomLogger,
        @inject(CustomDatabase) private readonly database: CustomDatabase
    ) {
        super({
            intents: 131071
        });
    }

    public async init() {
        this.customLogger.listen();
        await importx(`${process.cwd()}/src/app/{events,interactions}/**/*.ts`);

        if (!process.env.BOT_TOKEN) {
            this.customLogger.log(LogLevel.ERROR, `Bot token is not provided`);
            process.exit(1);
        }

        try {
            await this.login(process.env.BOT_TOKEN);
            await this.database.init();
            this.customLogger.log(
                LogLevel.INFO,
                `Client ${this.user?.username} in running`
            );
        } catch (error) {
            this.customLogger.handleError(error, `Client cannot start`, true);
            process.exit(1);
        }
    }
}
