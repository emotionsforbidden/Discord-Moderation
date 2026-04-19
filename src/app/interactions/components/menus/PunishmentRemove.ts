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
export class ModerationPunishmentRemoveMenu {
    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService
    ) {}

    @SelectMenuComponent({
        id: /^moderationPunishmentRemove-/
    })
    public async execute(ctx: StringSelectMenuInteraction<'cached'>) {
        const type = ctx.values[0] as PunishmentType;
        const targetId = this.utils.getParamsFromId(ctx.customId)[1];

        await ctx.showModal(
            new ModalBuilder()
                .setTitle(`Punishment revoke`)
                .setCustomId(`moderationPunishmentRemove${type}-${targetId}`)
                .setLabelComponents(
                    new LabelBuilder()
                        .setLabel(`Reason`)
                        .setTextInputComponent(
                            new TextInputBuilder()
                                .setStyle(TextInputStyle.Paragraph)
                                .setMaxLength(150)
                                .setCustomId('reason')
                        )
                )
        );
    }
}
