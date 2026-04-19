import { inject, singleton } from 'tsyringe';
import {
    ActionRowBuilder,
    AnyComponentBuilder,
    bold,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    InteractionEditReplyOptions,
    InteractionReplyOptions,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder
} from 'discord.js';
import type { AnyInteraction } from '@src/libs/common/discordjs/types/AnyInteraction';
import { GenerateModPanelDto } from '@src/libs/responses/dto/GenerateModPanelDto';
import { DateService } from '@src/libs/common/date/Date.service';
import { PaginatorPageAction } from '@src/libs/responses/enums/PaginatorPageAction';
import { PunishmentType } from '@src/libs/moderation/enums/PunishmentType';
import { UsersService } from '@src/libs/users/Users.service';
import { TransformersService } from '@src/libs/transformers/Transformers.service';

@singleton()
export class ResponsesService {
    public constructor(
        @inject(DateService) private readonly date: DateService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(TransformersService)
        private readonly transformers: TransformersService
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

    public modifyContainer(
        builder: ContainerBuilder,
        icon: string | null,
        text: string[]
    ) {
        if (icon) {
            builder.addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(icon))
                    .addTextDisplayComponents(
                        text.map((value) =>
                            new TextDisplayBuilder().setContent(value)
                        )
                    )
            );
        } else {
            builder.addTextDisplayComponents(
                text.map((value) => new TextDisplayBuilder().setContent(value))
            );
        }

        return builder;
    }

    public generateBackButton(
        module: string | null,
        params: (string | number)[] = [],
        removeLabel: boolean = false
    ) {
        const builder = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(
                `back${module}${params.length ? `-${params.join('-')}` : ``}`
            );

        if (!removeLabel) {
            builder.setLabel(`Back`);
        }

        return builder;
    }

    public generateModActionPanel(dto: GenerateModPanelDto) {
        const availablePunishmentsTypes = [
            new StringSelectMenuOptionBuilder()
                .setLabel(`Text mute`)
                .setValue(PunishmentType.TEXT_MUTE),

            new StringSelectMenuOptionBuilder()
                .setLabel(`Voice mute`)
                .setValue(PunishmentType.VOICE_MUTE),

            new StringSelectMenuOptionBuilder()
                .setLabel(`Warning`)
                .setValue(PunishmentType.WARN),

            new StringSelectMenuOptionBuilder()
                .setLabel(`Ban`)
                .setValue(PunishmentType.BAN)
        ];

        return dto.builder
            .addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(
                            dto.target.displayAvatarURL()
                        )
                    )
                    .addTextDisplayComponents(
                        [
                            `## Selected member:`,
                            [
                                `- ${dto.target}`,
                                `- ${dto.target.user.username}`,
                                `- ${dto.target.id}`
                            ].join(`\n`)
                        ].map((value) =>
                            new TextDisplayBuilder().setContent(value)
                        )
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                [
                    `## User information:`,
                    [
                        `- Account created: <t:${this.transformers.toSeconds(dto.target.user.createdAt.getTime())}:f>`,
                        `- Joined server: <t:${this.transformers.toSeconds(dto.target.joinedTimestamp ?? this.date.nowTimestamp())}:f>`,
                        `- Device: ${bold(this.users.checkForDevice(dto.target))}`
                    ].join(`\n`)
                ].map((value) => new TextDisplayBuilder().setContent(value))
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Large)
                    .setDivider(true)
            )
            .addTextDisplayComponents(
                [
                    `## Active punishments:`,
                    [
                        `- Text mute: ${this.transformers.humanizeBoolean(dto.doc.activePunishments.textMute.status)}`,
                        `- Voice mute: ${this.transformers.humanizeBoolean(dto.doc.activePunishments.voiceMute.status)}`,
                        `- Warnings: ${bold(String(dto.doc.activePunishments.warns))}`,
                        `- Ban: ${this.transformers.humanizeBoolean(dto.doc.activePunishments.ban.status)}`
                    ].join(`\n`)
                ].map((value) => new TextDisplayBuilder().setContent(value))
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setSpacing(SeparatorSpacingSize.Large)
                    .setDivider(true)
            )
            .addActionRowComponents((actionRow) =>
                actionRow.setComponents(
                    new StringSelectMenuBuilder()
                        .setPlaceholder(`Choose punishment type to execute`)
                        .setCustomId(
                            `moderationPunishmentExecute-${dto.target.id}`
                        )
                        .setDisabled(dto.targetIsStaff)
                        .setOptions(availablePunishmentsTypes)
                )
            )
            .addActionRowComponents((actionRow) =>
                actionRow.setComponents(
                    new StringSelectMenuBuilder()
                        .setPlaceholder(`Choose punishment type to revoke`)
                        .setCustomId(
                            `moderationPunishmentRemove-${dto.target.id}`
                        )
                        .setOptions(availablePunishmentsTypes)
                )
            );
    }

    public paginator(
        module: string,
        needToDisable: {
            start: boolean;
            left: boolean;
            right: boolean;
            end: boolean;
        },
        parameters: (string | number)[]
    ) {
        return [
            new ButtonBuilder()
                .setLabel(`Start`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(needToDisable.start)
                .setCustomId(
                    `${module}Page-${PaginatorPageAction.MOVE_START}${parameters ? `-${parameters?.join('-')}` : ``}`
                ),

            new ButtonBuilder()
                .setLabel(`Left`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(needToDisable.left)
                .setCustomId(
                    `${module}Page-${PaginatorPageAction.MOVE_LEFT}${parameters ? `-${parameters?.join('-')}` : ``}`
                ),

            new ButtonBuilder()
                .setLabel(`Right`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(needToDisable.right)
                .setCustomId(
                    `${module}Page-${PaginatorPageAction.MOVE_RIGHT}${parameters ? `-${parameters?.join('-')}` : ``}`
                ),

            new ButtonBuilder()
                .setLabel(`End`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(needToDisable.end)
                .setCustomId(
                    `${module}Page-${PaginatorPageAction.MOVE_END}${parameters ? `-${parameters?.join('-')}` : ``}`
                )
        ];
    }
}
