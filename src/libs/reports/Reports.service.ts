import { inject, singleton } from 'tsyringe';
import { SendReportDto } from '@src/libs/reports/dto/SendReportDto';
import { UtilsService } from '@src/libs/utils/Utils.service';
import {
    ButtonBuilder,
    ButtonStyle,
    channelLink,
    ChannelType,
    codeBlock,
    ContainerBuilder,
    GuildMember,
    MessageFlags,
    messageLink,
    OverwriteType,
    PermissionFlagsBits,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextChannel,
    TextDisplayBuilder,
    ThumbnailBuilder,
    UserSelectMenuBuilder,
    VoiceChannel
} from 'discord.js';
import { ConfigsStorage } from '@config';
import { ReportsManager } from '@src/libs/common/database/reports/Reports.manager';
import { UsersService } from '@src/libs/users/Users.service';
import { AcceptReportDto } from '@src/libs/reports/dto/AcceptReportDto';
import { CloseReportDto } from '@src/libs/reports/dto/CloseReportDto';
import { LogsService } from '@src/libs/logs/Logs.service';
import { CustomLogger } from '@src/libs/common/logger/CustomLogger';

@singleton()
export class ReportsService {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ReportsManager)
        private readonly reportsDatabase: ReportsManager,
        @inject(UsersService) private readonly users: UsersService,
        @inject(LogsService) private readonly logs: LogsService,
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    public async send(dto: SendReportDto) {
        const channel = await this.utils.getChannel<TextChannel>(
            dto.sender.guild,
            this.configs.discord.channels.reports.text
        );

        if (!channel) {
            return;
        }

        const requestDoc = await this.reportsDatabase.create(dto);

        try {
            const message = await channel.send({
                components: [
                    new ContainerBuilder()
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.sender.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Sender:`,
                                        [
                                            `- ${dto.sender}`,
                                            `- ${dto.sender.user.username}`,
                                            `- ${dto.sender.id}`
                                        ].join(`\n`)
                                    ].map((value) =>
                                        new TextDisplayBuilder().setContent(
                                            value
                                        )
                                    )
                                )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setDivider(true)
                                .setSpacing(SeparatorSpacingSize.Large)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.target.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Target:`,
                                        [
                                            `- ${dto.target}`,
                                            `- ${dto.target.user.username}`,
                                            `- ${dto.target.id}`
                                        ].join(`\n`)
                                    ].map((value) =>
                                        new TextDisplayBuilder().setContent(
                                            value
                                        )
                                    )
                                )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setDivider(true)
                                .setSpacing(SeparatorSpacingSize.Large)
                        )
                        .addTextDisplayComponents(
                            [`## Reason:`, codeBlock(dto.reason)].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setDivider(true)
                                .setSpacing(SeparatorSpacingSize.Large)
                        )
                        .addActionRowComponents((actionRow) =>
                            actionRow.setComponents(
                                new ButtonBuilder()
                                    .setLabel(`Accept`)
                                    .setStyle(ButtonStyle.Success)
                                    .setCustomId(
                                        `reportAccept-${requestDoc.snowflake.id}`
                                    ),

                                new ButtonBuilder()
                                    .setLabel(`Decline`)
                                    .setStyle(ButtonStyle.Danger)
                                    .setCustomId(
                                        `reportDecline-${requestDoc.snowflake.id}`
                                    )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
            requestDoc.link = messageLink(
                message.channelId,
                message.id,
                message.guildId
            );

            await requestDoc.save();
            return true;
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot send message to channel ${channel.id}`
            );
            await requestDoc.remove();
            return null;
        }
    }

    public canInteract(target: GuildMember, executor: GuildMember) {
        return this.users.hasRoles(
            target,
            this.configs.discord.roles.staff,
            true
        )
            ? this.users.hasRoles(
                  executor,
                  this.configs.discord.roles.reports.high,
                  true
              )
            : this.users.hasRoles(
                  executor,
                  this.configs.discord.roles.reports.all,
                  true
              );
    }

    public async accept(dto: AcceptReportDto) {
        dto.doc.moderatorId = dto.moderator.id;
        dto.doc.moderatorsHistory.push(dto.moderator.id);
        dto.doc.status = true;

        const [channel] = await Promise.all([
            this.utils.createChannel<VoiceChannel>(dto.moderator.guild, {
                name: `Report・${dto.sender.user.username}`,
                type: ChannelType.GuildVoice,
                parent: this.configs.discord.channels.reports.category,
                permissionOverwrites: [
                    {
                        id: dto.sender.id,
                        type: OverwriteType.Member,
                        allow: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: dto.moderator.id,
                        type: OverwriteType.Member,
                        allow: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: dto.moderator.guild.id,
                        type: OverwriteType.Role,
                        allow: [
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.Speak,
                            PermissionFlagsBits.UseVAD,
                            PermissionFlagsBits.SendMessages
                        ],
                        deny: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.ManageMessages
                        ]
                    }
                ]
            }),
            dto.doc.save()
        ]);

        if (!channel) {
            dto.doc.moderatorId = null;
            dto.doc.moderatorsHistory = [];
            dto.doc.status = false;

            await dto.doc.save();
            return;
        }

        const builder = new ContainerBuilder(
            dto.builder.toJSON()
        ).spliceComponents(dto.builder.components.length - 1, 1, [
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(
                        dto.moderator.displayAvatarURL({ forceStatic: true })
                    )
                )
                .addTextDisplayComponents(
                    [
                        `## Accepted:`,
                        [
                            `- ${dto.moderator}`,
                            `- ${dto.moderator.user.username}`,
                            `- ${dto.moderator.id}`
                        ].join(`\n`)
                    ].map((value) => new TextDisplayBuilder().setContent(value))
                ),

            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Large)
        ]);
        const link = channelLink(channel.id, channel.guildId);

        await channel.send({
            components: [
                builder
                    .addActionRowComponents((actionRow) =>
                        actionRow.setComponents(
                            new UserSelectMenuBuilder()
                                .setPlaceholder(`Select to transfer`)
                                .setCustomId(
                                    `reportTransfer-${dto.doc.snowflake.id}`
                                )
                        )
                    )
                    .addActionRowComponents((actionRow) =>
                        actionRow.setComponents(
                            new ButtonBuilder()
                                .setLabel(`Close discussion`)
                                .setStyle(ButtonStyle.Danger)
                                .setCustomId(
                                    `reportClose-${dto.doc.snowflake.id}`
                                ),

                            new ButtonBuilder()
                                .setLabel(`Discussion members`)
                                .setStyle(ButtonStyle.Primary)
                                .setCustomId(
                                    `reportUsers-${dto.doc.snowflake.id}`
                                )
                        )
                    )
            ],
            flags: MessageFlags.IsComponentsV2
        });
        return link;
    }

    public async close(dto: CloseReportDto) {
        await Promise.all([dto.doc.remove(), this.logs.reportClose(dto)]);
        await this.utils.deleteChannelFromGuild(
            dto.executor.guild,
            dto.channel.id
        );
    }
}
