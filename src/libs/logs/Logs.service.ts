import { inject, singleton } from 'tsyringe';
import { CloseReportDto } from '@src/libs/reports/dto/CloseReportDto';
import {
    ButtonBuilder,
    ButtonStyle,
    codeBlock,
    ContainerBuilder,
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

@singleton()
export class LogsService {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService
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
}
