import { Discord, SelectMenuComponent } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { MessageFlags, StringSelectMenuInteraction } from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { ModerationService } from '@src/libs/moderation/Moderation.service';
import { TextFormattersService } from '@src/libs/text-formatters/TextFormatters.service';

@Discord()
@injectable()
export class PunishmentInfoMenu {
    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(ModerationService)
        private readonly moderation: ModerationService,
        @inject(TextFormattersService)
        private readonly textFormat: TextFormattersService
    ) {}

    @SelectMenuComponent({
        id: /^punishmentInfo-/
    })
    public async execute(ctx: StringSelectMenuInteraction<'cached'>) {
        const executorId = this.utils.getParamsFromId(ctx.customId)[1];

        if (executorId !== ctx.user.id) return;

        await ctx.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const punishmentIndex = Number(ctx.values[0]);
        const memberId = this.utils.getParamsFromId(ctx.customId)[2];
        const member = await this.utils.getMember(ctx.guild, memberId);

        if (!member) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Punishment info')
                        .setDescription('Member **not found**')
                ]
            });
        }

        const doc = await this.usersDatabase.get(memberId, ctx.guildId);
        const punishment = doc.history[punishmentIndex];

        if (!punishment) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Punishment info')
                        .setDescription('Punishment **not found**')
                ]
            });
        }

        return await this.responses.replyWithMessage(ctx, {
            embeds: [
                this.responses
                    .getEmbedTemplate(member.displayAvatarURL())
                    .setTitle(`Punishment info`)
                    .setDescription(
                        [
                            `・**Member:** ${member}`,
                            `・**Moderator:** <@${punishment.moderator}>`,
                            `・**Type:** \`${this.textFormat.humanizePunishmentType(punishment.type)}\``,
                            `・**Date:** <t:${Math.trunc(punishment.date / 1000)}:f>`,
                            `・**Expires:** ${punishment.expires ? `<t:${Math.trunc(punishment.expires / 1000)}:f>` : `\`Without date\``}`
                        ].join(`\n`)
                    )
                    .setFields({
                        name: `> Reason`,
                        value: `\`\`\`${punishment.reason}\`\`\``
                    })
            ]
        });
    }
}
