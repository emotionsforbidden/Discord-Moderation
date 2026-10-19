import 'reflect-metadata';
import { config } from 'dotenv';
import { container } from 'tsyringe';
import { Client, DIService, tsyringeDependencyRegistryEngine } from 'discordx';
import { CustomLogger } from '@src/libs/common/logger/CustomLogger';
import { dirname, importx } from '@discordx/importer';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import { CustomDatabase } from '@src/libs/common/database/CustomDatabase';
import { GatewayIntentBits, Options, Partials } from 'discord.js';
import { ConfigsStorage } from '@config';
import ms from 'ms';

config();
DIService.engine = tsyringeDependencyRegistryEngine.setInjector(container);

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.GuildMember, Partials.Channel],
    makeCache: Options.cacheWithLimits({
        ...Object.fromEntries(
            Object.keys(Options.cacheWithLimits({})).map((k) => [
                k,
                { maxSize: 0 }
            ])
        ),
        ThreadManager: { maxSize: 100 },
        GuildMemberManager: {
            maxSize: 5000
        }
    }),
    sweepers: {
        guildMembers: {
            interval: ms('1h') / 1000,
            filter: () => {
                return (member) => {
                    const joinedAt = member.joinedTimestamp ?? 0;

                    return Date.now() - joinedAt < ms('1d');
                };
            }
        },
        threads: {
            interval: ms('1h') / 1000,
            lifetime: ms('30m') / 1000
        }
    },
    botGuilds: [ConfigsStorage.discord.guildId]
});

async function bootstrap() {
    const logger = container.resolve(CustomLogger);

    if (!process.env.BOT_TOKEN) {
        logger.log(LogLevel.ERROR, 'Token is not provided');
        process.exit(1);
    }

    logger.listen();
    await importx(
        `${dirname(import.meta.url)}/{events,interactions}/**/*.{ts,js}`
    );

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

void bootstrap();
