import { ArgsOf, Discord, On } from 'discordx';
import { injectable } from 'tsyringe';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { Events } from 'discord.js';

@Discord()
@injectable()
export class InteractionsEvent {
    @On({ event: Events.InteractionCreate })
    public async onInteractionCreate(
        [interaction]: ArgsOf<Events.InteractionCreate>,
        client: CustomClient
    ) {
        await client.executeInteraction(interaction);
    }
}
