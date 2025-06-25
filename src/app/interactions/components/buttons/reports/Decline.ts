import { ButtonComponent, Discord } from 'discordx';
import { inject, injectable } from 'tsyringe';
import {
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { ResponsesService } from '@src/libs/responses/Responses.service';

@Discord()
@injectable()
export class ReportDeclineButton {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService
    ) {}

    @ButtonComponent({
        id: /^declineReport-/
    })
    public async execute(ctx: ButtonInteraction<'cached'>) {
        return await ctx.showModal(
            new ModalBuilder()
                .setTitle(`Decline report`)
                .setCustomId(ctx.customId)
                .setComponents(
                    this.responses.getModalRowTemplate([
                        new TextInputBuilder()
                            .setLabel('Reason')
                            .setStyle(TextInputStyle.Paragraph)
                            .setMaxLength(150)
                            .setCustomId('reason')
                    ])
                )
        );
    }
}
