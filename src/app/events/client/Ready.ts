import { ArgsOf, DApplicationCommand, Discord, Once } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import { ConfigsStorage } from '@config';
import { ModerationService } from '@src/libs/moderation/Moderation.service';
import { Events } from 'discord.js';

@Discord()
@injectable()
export class ReadyEvent {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(CustomLogger) private readonly logger: CustomLogger,
        @inject(ModerationService)
        private readonly moderation: ModerationService
    ) {}

    @Once({ event: Events.ClientReady })
    public async onReady(_: ArgsOf<Events.ClientReady>, client: CustomClient) {
        const guild = client.guilds.cache.get(this.configs.discord.guildId);

        if (!guild) {
            this.logger.log(LogLevel.WARN, "Bot isn't added to the server");
        }

        await client.initGuildApplicationCommands(
            this.configs.discord.guildId,
            client.applicationCommands as DApplicationCommand[]
        );
        this.moderation.autoRemoveExpired(guild);
    }
}
