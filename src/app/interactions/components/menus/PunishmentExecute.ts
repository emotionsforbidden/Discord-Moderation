import { Discord, SelectMenuComponent } from 'discordx';
import { inject, singleton } from 'tsyringe';
import {
    LabelBuilder,
    ModalBuilder,
    StringSelectMenuInteraction,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { PunishmentType } from '@src/libs/moderation/enums/PunishmentType';
import { UtilsService } from '@src/libs/utils/Utils.service';

@Discord()
@singleton()
export class ModerationPunishmentExecuteMenu {
    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService
    ) {}

    @SelectMenuComponent({
        id: /^moderationPunishmentExecute-/
    })
    public async execute(ctx: StringSelectMenuInteraction<'cached'>) {
        const type = ctx.values[0] as PunishmentType;
        const targetId = this.utils.getParamsFromId(ctx.customId)[1];
        const labels = [
            new LabelBuilder()
                .setLabel(`Reason`)
                .setTextInputComponent(
                    new TextInputBuilder()
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(150)
                        .setCustomId('reason')
                )
        ];

        if (type !== PunishmentType.WARN) {
            labels.push(
                new LabelBuilder()
                    .setLabel(`Duration`)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder(`Example: 1m, 1h, 1d`)
                            .setCustomId('duration')
                    )
            );
        }

        await ctx.showModal(
            new ModalBuilder()
                .setTitle(`Punishment execute`)
                .setCustomId(`moderationPunishmentExecute${type}-${targetId}`)
                .setLabelComponents(labels)
        );
    }
}
