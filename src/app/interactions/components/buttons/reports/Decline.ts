import { ButtonComponent, Discord } from 'discordx';
import { singleton } from 'tsyringe';
import {
    ButtonInteraction,
    LabelBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

@Discord()
@singleton()
export class ReportDeclineButton {
    @ButtonComponent({
        id: /^reportDecline-/
    })
    public async execute(ctx: ButtonInteraction<'cached'>) {
        await ctx.showModal(
            new ModalBuilder()
                .setTitle(`Report decline`)
                .setCustomId(ctx.customId)
                .setLabelComponents(
                    new LabelBuilder()
                        .setLabel(`Reason`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setMaxLength(250)
                                .setStyle(TextInputStyle.Paragraph)
                                .setCustomId(`reason`)
                        )
                )
        );
    }
}
