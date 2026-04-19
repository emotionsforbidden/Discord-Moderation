import 'reflect-metadata';
import { config } from 'dotenv';
import { container } from 'tsyringe';
import { Client, DIService, tsyringeDependencyRegistryEngine } from 'discordx';
import { CustomLogger } from '@src/libs/common/logger/CustomLogger';
import { importx } from '@discordx/importer';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import { CustomDatabase } from '@src/libs/common/database/CustomDatabase';
import { GatewayIntentBits } from 'discord.js';
import { ConfigsStorage } from '@config';

config();
DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container);

const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    botGuilds: [ConfigsStorage.discord.guildId]
});

async function bootstrap() {
    const logger = container.resolve(CustomLogger);

    if (!process.env.BOT_TOKEN) {
        logger.log(LogLevel.ERROR, 'Token is not provided');
        process.exit(1);
    }

    logger.listen();
    await importx(`${process.cwd()}/app/{events,interactions}/**/*.ts`);

    const database = container.resolve(CustomDatabase);

    try {
        await bot.login(process.env.BOT_TOKEN);
        await Promise.all([database.init(), bot.initApplicationCommands()]);

        logger.log(LogLevel.INFO, `Client ${bot.user?.username} is running`);
    } catch (error) {
        logger.handleError(error, 'Error while starting client', true);
        process.exit(1);
    }
}

bootstrap();
