import { inject, injectable } from 'tsyringe';
import {
    ActionRowBuilder,
    AnyComponentBuilder,
    APIEmbed,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    EmbedData,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import type { AnyInteraction } from '@src/libs/common/discordjs/types/AnyInteraction';
import { GenerateModPanelDto } from '@src/libs/responses/dto/GenerateModPanelDto';
import { DateService } from '@src/libs/date/Date.service';
import { GenerateHistoryPageDto } from '@src/libs/responses/dto/GenerateHistoryPageDto';
import { PaginatorPageAction } from '@src/libs/responses/enums/PaginatorPageAction';
import { TextFormattersService } from '@src/libs/text-formatters/TextFormatters.service';

@injectable()
export class ResponsesService {
    public constructor(
        @inject(DateService) private readonly date: DateService,
        @inject(TextFormattersService)
        private readonly textFormat: TextFormattersService
    ) {}

    public async replyWithMessage(
        ctx: AnyInteraction,
        props: InteractionReplyOptions | InteractionEditReplyOptions,
        isFollowUp: boolean = false
    ) {
        if (isFollowUp) {
            await ctx.followUp(props as InteractionReplyOptions);
            return;
        }

        if (ctx.deferred) {
            await ctx.editReply(props as InteractionEditReplyOptions);
            return;
        }

        await ctx.reply(props as InteractionReplyOptions);
        return;
    }

    public getMessageRowTemplate(components: AnyComponentBuilder[]) {
        return new ActionRowBuilder<AnyComponentBuilder>()
            .setComponents(components)
            .toJSON();
    }

    public getModalRowTemplate(components: TextInputBuilder[]) {
        return new ActionRowBuilder<TextInputBuilder>().setComponents(
            components
        );
    }

    public getEmbedTemplate(icon: string | null) {
        return new EmbedBuilder().setColor(0x2b2d31).setThumbnail(icon);
    }

    public generateModActionPanel(dto: GenerateModPanelDto) {
        return {
            embeds: [
                this.getEmbedTemplate(dto.target.displayAvatarURL())
                    .setTitle('Moderation action')
                    .setDescription(
                        [
                            `・**Member:** ${dto.target}`,
                            `・**Joined:** <t:${Math.trunc((dto.target.joinedTimestamp ?? this.date.nowTimestamp()) / 1000)}:D>`,
                            `・**Created:** <t:${Math.trunc(dto.target.user.createdTimestamp / 1000)}:D>`
                        ].join('\n')
                    )
            ],
            components: [
                this.getMessageRowTemplate([
                    new ButtonBuilder()
                        .setLabel('Warn')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!!dto.doc.banInfo || dto.targetIsStaff)
                        .setCustomId(`warnUser-${dto.target.id}`),

                    new ButtonBuilder()
                        .setLabel('Mute')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!!dto.doc.muteInfo || dto.targetIsStaff)
                        .setCustomId(`muteUser-${dto.target.id}`),

                    new ButtonBuilder()
                        .setLabel('Ban')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!!dto.doc.banInfo || dto.targetIsStaff)
                        .setCustomId(`banUser-${dto.target.id}`)
                ]),

                this.getMessageRowTemplate([
                    new ButtonBuilder()
                        .setLabel('Unwarn')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!dto.doc.warnsInfo)
                        .setCustomId(`unwarnUser-${dto.target.id}`),

                    new ButtonBuilder()
                        .setLabel('Unmute')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!dto.doc.muteInfo)
                        .setCustomId(`unmuteUser-${dto.target.id}`),

                    new ButtonBuilder()
                        .setLabel('Unban')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!dto.doc.banInfo)
                        .setCustomId(`unbanUser-${dto.target.id}`)
                ])
            ]
        } as InteractionEditReplyOptions;
    }

    public generateHistoryPage(dto: GenerateHistoryPageDto) {
        const pageNumber = dto.pageNumber ?? 0;

        return {
            embeds: [
                this.getEmbedTemplate(dto.member.displayAvatarURL())
                    .setTitle(
                        `Punishments history — ${dto.member.user.displayName}`
                    )
                    .setDescription(
                        dto.page.sliced
                            .map((punishment) =>
                                [
                                    `[<t:${Math.trunc(punishment.date / 1000)}:f>]`,
                                    `・**Moderator:** <@${punishment.moderator}>`,
                                    `・**Type:** \`${this.textFormat.humanizePunishmentType(punishment.type)}\``,
                                    `・**Reason:** \`${punishment.reason}\``
                                ].join(`\n`)
                            )
                            .join(`\n\n`) || `History **is empty**`
                    )
                    .setFooter({
                        text: `Page ${pageNumber + 1}/${dto.page.pagesCount || 1}`
                    })
            ],
            components: [
                this.getMessageRowTemplate([
                    new StringSelectMenuBuilder()
                        .setPlaceholder('Select punishment')
                        .setDisabled(!dto.page.sliced.length)
                        .setCustomId(
                            `punishmentInfo-${dto.executor.id}-${dto.member.id}`
                        )
                        .setOptions(
                            dto.page.sliced.length
                                ? dto.page.sliced.map((_, index) => {
                                      return new StringSelectMenuOptionBuilder()
                                          .setLabel(
                                              `#` +
                                                  String(
                                                      index + 1 + dto.page.from
                                                  )
                                          )
                                          .setValue(
                                              String(index + dto.page.from)
                                          );
                                  })
                                : []
                        )
                ]),

                this.getMessageRowTemplate([
                    new ButtonBuilder()
                        .setLabel('Left')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!dto.pageNumber)
                        .setCustomId(
                            `punishmentsHistoryPaginator-${PaginatorPageAction.MOVE_LEFT}-${dto.executor.id}-${dto.member.id}-${dto.pageNumber}`
                        ),

                    new ButtonBuilder()
                        .setLabel('Right')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!dto.page.checkForNextPage)
                        .setCustomId(
                            `punishmentsHistoryPaginator-${PaginatorPageAction.MOVE_RIGHT}-${dto.executor.id}-${dto.member.id}-${dto.pageNumber}`
                        )
                ])
            ]
        } as InteractionEditReplyOptions;
    }

    public generatePunishmentModal(
        customId: string,
        withExpirationDate: boolean = true
    ) {
        const defaultComponents = this.getModalRowTemplate([
            new TextInputBuilder()
                .setLabel('Reason')
                .setMaxLength(150)
                .setStyle(TextInputStyle.Paragraph)
                .setCustomId('reason')
        ]);

        return new ModalBuilder()
            .setTitle(`Punishment modal`)
            .setCustomId(customId)
            .setComponents(
                withExpirationDate
                    ? [
                          defaultComponents,
                          this.getModalRowTemplate([
                              new TextInputBuilder()
                                  .setLabel('Duration')
                                  .setPlaceholder('Example: 1m, 1h')
                                  .setStyle(TextInputStyle.Short)
                                  .setCustomId('duration')
                          ])
                      ]
                    : [defaultComponents]
            );
    }

    public cloneEmbed(data: EmbedData | APIEmbed) {
        return new EmbedBuilder(data);
    }
}
