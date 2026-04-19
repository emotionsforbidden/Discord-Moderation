import { Discord, Slash } from 'discordx';
import { singleton } from 'tsyringe';
import {
    ChatInputCommandInteraction,
    LabelBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    UserSelectMenuBuilder
} from 'discord.js';

@Discord()
@singleton()
export class ReportCommand {
    @Slash({
        name: `report`,
        description: 'Send report'
    })
    public async execute(ctx: ChatInputCommandInteraction<'cached'>) {
        await ctx.showModal(
            new ModalBuilder()
                .setTitle(`Report send`)
                .setCustomId(`reportSend`)
                .setLabelComponents(
                    new LabelBuilder()
                        .setLabel(`Member`)
                        .setUserSelectMenuComponent(
                            new UserSelectMenuBuilder()
                                .setPlaceholder(`Select member`)
                                .setCustomId(`member`)
                        ),
                    new LabelBuilder()
                        .setLabel(`Reason`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setStyle(TextInputStyle.Paragraph)
                                .setMaxLength(500)
                                .setCustomId(`reason`)
                        )
                )
        );
    }
}
