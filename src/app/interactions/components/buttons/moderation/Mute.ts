import { ButtonComponent, Discord } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ButtonInteraction } from 'discord.js';
import { ResponsesService } from '@src/libs/responses/Responses.service';

@Discord()
@injectable()
export class MuteButton {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService
    ) {}

    @ButtonComponent({
        id: /^muteUser-/
    })
    public async execute(ctx: ButtonInteraction<'cached'>) {
        return await ctx.showModal(
            this.responses.generatePunishmentModal(ctx.customId)
        );
    }
}
