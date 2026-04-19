import { ArgsOf, Client, Discord, Once } from 'discordx';
import { inject, singleton } from 'tsyringe';
import { ConfigsStorage } from '@config';
import { ModerationService } from '@src/libs/moderation/Moderation.service';
import { Events } from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';

@Discord()
@singleton()
export class ReadyEvent {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(ModerationService)
        private readonly moderation: ModerationService,
        @inject(UtilsService) private readonly utils: UtilsService
    ) {}

    @Once({ event: Events.ClientReady })
    public async onReady(_: ArgsOf<Events.ClientReady>, client: Client) {
        const guild = await this.utils.getGuild(
            client,
            this.configs.discord.guildId
        );

        if (!guild) {
            return;
        }

        this.moderation.autoRemoveExpired(guild);
    }
}
