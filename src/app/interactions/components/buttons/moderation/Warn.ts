import { ButtonComponent, Discord } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ButtonInteraction } from 'discord.js';
import { ResponsesService } from '@src/libs/responses/Responses.service';

@Discord()
@injectable()
export class WarnButton {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService
    ) {}

    @ButtonComponent({
        id: /^warnUser-/
    })
    public async execute(ctx: ButtonInteraction<'cached'>) {
        return await ctx.showModal(
            this.responses.generatePunishmentModal(ctx.customId, false)
        );
    }
}
