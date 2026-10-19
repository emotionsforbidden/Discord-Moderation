import { inject, singleton } from 'tsyringe';
import { CloseReportDto } from '@src/libs/reports/dto/CloseReportDto';
import {
    ButtonBuilder,
    ButtonStyle,
    ClientUser,
    codeBlock,
    ContainerBuilder,
    GuildMember,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextChannel,
    TextDisplayBuilder,
    ThreadAutoArchiveDuration,
    ThumbnailBuilder,
    userMention
} from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ConfigsStorage } from '@config';
import * as discordTranscripts from 'discord-html-transcripts';
import { ExecutePunishmentDto } from '@src/libs/moderation/dto/ExecutePunishmentDto';
import { TransformersService } from '@src/libs/transformers/Transformers.service';

@singleton()
export class LogsService {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(TransformersService)
        private readonly transformers: TransformersService
    ) {}

    public async reportClose(dto: CloseReportDto) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.executor.guild,
            this.configs.discord.channels.logs.reports
        );

        if (!logs) {
            return;
        }

        const [chatHistory, message] = await Promise.all([
            discordTranscripts.createTranscript(dto.channel, {
                poweredBy: false,
                saveImages: true
            }),
            logs.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## Logs — Report close`
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.executor.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Responsible:`,
                                        [
                                            `- ${dto.executor}`,
                                            `- ${dto.executor.user.username}`,
                                            `- ${dto.executor.id}`
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            [
                                `## Moderators list:`,
                                dto.doc.moderatorsHistory
                                    .map((id) => userMention(id))
                                    .join(`, `)
                            ].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            [`## Reason:`, codeBlock(dto.doc.reason)].map(
                                (value) =>
                                    new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    this.configs.utils.invisibleLine
                                )
                            )
                        )
                        .addActionRowComponents((actionRow) =>
                            actionRow.setComponents(
                                new ButtonBuilder()
                                    .setLabel(`Go to message`)
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(dto.doc.link)
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            })
        ]);

        const thread = await message.startThread({
            name: `Chat history`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneHour
        });

        await thread.send({
            files: [chatHistory]
        });
    }

    public async executeTextMute(dto: ExecutePunishmentDto) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.executor.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (logs) {
            await logs.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## Logs — Text mute`
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.executor.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Moderator:`,
                                        [
                                            `- ${dto.executor}`,
                                            `- ${dto.executor.user.username}`,
                                            `- ${dto.executor.id}`
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                        .addTextDisplayComponents(
                            [
                                `## Expired:`,
                                `<t:${this.transformers.toSeconds(dto.endsAt)}:f>`
                            ].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    this.configs.utils.invisibleLine
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        }
    }

    public async executeVoiceMute(dto: ExecutePunishmentDto) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.executor.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (logs) {
            await logs.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## Logs — Voice mute`
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.executor.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Moderator:`,
                                        [
                                            `- ${dto.executor}`,
                                            `- ${dto.executor.user.username}`,
                                            `- ${dto.executor.id}`
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                        .addTextDisplayComponents(
                            [
                                `## Expired:`,
                                `<t:${this.transformers.toSeconds(dto.endsAt)}:f>`
                            ].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    this.configs.utils.invisibleLine
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        }
    }

    public async executeBan(dto: ExecutePunishmentDto) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.executor.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (logs) {
            await logs.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## Logs — Ban`)
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.executor.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Moderator:`,
                                        [
                                            `- ${dto.executor}`,
                                            `- ${dto.executor.user.username}`,
                                            `- ${dto.executor.id}`
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                        .addTextDisplayComponents(
                            [
                                `## Expired:`,
                                `<t:${this.transformers.toSeconds(dto.endsAt)}:f>`
                            ].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    this.configs.utils.invisibleLine
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        }
    }

    public async executeWarn(dto: ExecutePunishmentDto) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.executor.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (logs) {
            await logs.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## Logs — Warn`
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.executor.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Moderator:`,
                                        [
                                            `- ${dto.executor}`,
                                            `- ${dto.executor.user.username}`,
                                            `- ${dto.executor.id}`
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            [`## Reason:`, codeBlock(dto.reason)].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    this.configs.utils.invisibleLine
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        }
    }

    public async removeBan(
        dto: Omit<ExecutePunishmentDto, 'endsAt' | 'type' | 'executor'> & {
            executor: GuildMember | ClientUser;
        }
    ) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.target.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (logs) {
            await logs.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## Logs — Unban`
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.executor.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Moderator:`,
                                        [
                                            `- ${dto.executor}`,
                                            `- ${dto.executor.displayName}`,
                                            `- ${dto.executor.id}`
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            [`## Reason:`, codeBlock(dto.reason)].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    this.configs.utils.invisibleLine
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        }
    }

    public async removeTextMute(
        dto: Omit<ExecutePunishmentDto, 'endsAt' | 'type' | 'executor'> & {
            executor: GuildMember | ClientUser;
        }
    ) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.target.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (logs) {
            await logs.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## Logs — Text mute removal`
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.executor.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Moderator:`,
                                        [
                                            `- ${dto.executor}`,
                                            `- ${dto.executor.displayName}`,
                                            `- ${dto.executor.id}`
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            [`## Reason:`, codeBlock(dto.reason)].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    this.configs.utils.invisibleLine
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        }
    }

    public async removeVoiceMute(
        dto: Omit<ExecutePunishmentDto, 'endsAt' | 'type' | 'executor'> & {
            executor: GuildMember | ClientUser;
        }
    ) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.target.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (logs) {
            await logs.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## Logs — Voice mute removal`
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.executor.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Moderator:`,
                                        [
                                            `- ${dto.executor}`,
                                            `- ${dto.executor.displayName}`,
                                            `- ${dto.executor.id}`
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            [`## Reason:`, codeBlock(dto.reason)].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    this.configs.utils.invisibleLine
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        }
    }

    public async removeWarn(
        dto: Omit<ExecutePunishmentDto, 'endsAt' | 'type'>
    ) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.executor.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (logs) {
            await logs.send({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `## Logs — Warn removal`
                            )
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder()
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(
                                    new ThumbnailBuilder().setURL(
                                        dto.executor.displayAvatarURL({
                                            forceStatic: true
                                        })
                                    )
                                )
                                .addTextDisplayComponents(
                                    [
                                        `## Moderator:`,
                                        [
                                            `- ${dto.executor}`,
                                            `- ${dto.executor.user.username}`,
                                            `- ${dto.executor.id}`
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
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
                                .setSpacing(SeparatorSpacingSize.Large)
                                .setDivider(true)
                        )
                        .addTextDisplayComponents(
                            [`## Reason:`, codeBlock(dto.reason)].map((value) =>
                                new TextDisplayBuilder().setContent(value)
                            )
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(
                                    this.configs.utils.invisibleLine
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: {
                    parse: [],
                    repliedUser: false
                }
            });
        }
    }
}
