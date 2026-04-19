import { ArgsOf, Client, Discord, On } from 'discordx';
import { singleton } from 'tsyringe';
import { Events } from 'discord.js';

@Discord()
@singleton()
export class InteractionsEvent {
    @On({ event: Events.InteractionCreate })
    public async onInteractionCreate(
        [interaction]: ArgsOf<Events.InteractionCreate>,
        client: Client
    ) {
        await client.executeInteraction(interaction);
    }
}
