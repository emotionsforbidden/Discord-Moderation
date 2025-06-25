import { inject, injectable } from 'tsyringe';
import { CloseReportDto } from '@src/libs/reports/dto/CloseReportDto';
import * as discordTranscripts from 'discord-html-transcripts';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ConfigsStorage } from '@config';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { PunishmentDto } from '@src/libs/moderation/dto/PunishmentDto';
import { PunishmentType } from '@src/libs/moderation/enums/PunishmentType';
import { RemovePunishmentDto } from '@src/libs/moderation/dto/RemovePunishmentDto';
import { TextFormattersService } from '@src/libs/text-formatters/TextFormatters.service';
import { TextChannel } from 'discord.js';

@injectable()
export class LogsService {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(CustomLogger) private readonly logger: CustomLogger,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(TextFormattersService)
        private readonly textFormat: TextFormattersService
    ) {}

    public async reportCloseLog(dto: CloseReportDto) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.channel.guild,
            this.configs.discord.channels.logs.reports
        );

        if (!logs || !logs.isSendable()) {
            this.logger.log(LogLevel.WARN, `Unknown channel for reports logs`);
            return;
        }

        const sender = await this.utils.getMember(
            dto.channel.guild,
            dto.doc.senderId
        );
        const target = await this.utils.getMember(
            dto.channel.guild,
            dto.doc.targetId
        );
        const chatHistory = await discordTranscripts.createTranscript(
            dto.channel,
            {
                poweredBy: false
            }
        );

        await logs.send({
            files: [chatHistory],
            embeds: [
                this.responses
                    .getEmbedTemplate(null)
                    .setTitle(`Report closed`)
                    .setFields([
                        {
                            name: `> Sender`,
                            value: sender
                                ? `・${sender}\n・${sender.user.username}\n・${sender.id}`
                                : `・<@${dto.doc.senderId}>`,
                            inline: true
                        },
                        {
                            name: `> Target`,
                            value: target
                                ? `・${target}\n・${target.user.username}\n・${target.id}`
                                : `・<@${dto.doc.targetId}>`,
                            inline: true
                        },
                        {
                            name: `> Closed by`,
                            value: `・${dto.executor}\n・${dto.executor.user.username}\n・${dto.executor.id}`,
                            inline: true
                        },
                        {
                            name: `> Moderators`,
                            value: `・${dto.doc.takenHistory
                                .map((id) => `<@${id}>`)
                                .join(`, `)}`,
                            inline: true
                        },
                        {
                            name: `> Reason`,
                            value: `\`\`\`${dto.doc.reason}\`\`\``,
                            inline: false
                        }
                    ])
            ]
        });
    }

    public async punishmentLog(dto: PunishmentDto, type: PunishmentType) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.executor.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (!logs || !logs.isSendable()) {
            this.logger.log(
                LogLevel.WARN,
                `Unknown channel for moderation logs`
            );
            return;
        }

        await logs.send({
            embeds: [
                this.responses
                    .getEmbedTemplate(null)
                    .setTitle(`Member punished`)
                    .setFields([
                        {
                            name: `> Executor`,
                            value: `・${dto.executor}\n・${dto.executor.user.username}\n・${dto.executor.id}`,
                            inline: true
                        },
                        {
                            name: `> Target`,
                            value: `・${dto.target}\n・${dto.target.user.username}\n・${dto.target.id}`,
                            inline: true
                        },
                        {
                            name: `> Type`,
                            value: `\`\`\`${this.textFormat.humanizePunishmentType(type)}\`\`\``,
                            inline: false
                        },
                        {
                            name: `> Reason`,
                            value: `\`\`\`${dto.reason}\`\`\``,
                            inline: false
                        }
                    ])
            ]
        });
    }

    public async removePunishmentLog(
        dto: RemovePunishmentDto,
        type: PunishmentType
    ) {
        const logs = await this.utils.getChannel<TextChannel>(
            dto.executor.guild,
            this.configs.discord.channels.logs.moderation
        );

        if (!logs || !logs.isSendable()) {
            this.logger.log(
                LogLevel.WARN,
                `Unknown channel for moderation logs`
            );
            return;
        }

        let fields = [
            {
                name: `> Executor`,
                value: `・${dto.executor}\n・${dto.executor.user.username}\n・${dto.executor.id}`,
                inline: true
            },
            {
                name: `> Type`,
                value: `\`\`\`${this.textFormat.humanizePunishmentType(type)}\`\`\``,
                inline: false
            }
        ];

        if (dto.target) {
            fields = [
                fields[0],
                {
                    name: `> Target`,
                    value: `・${dto.target}\n・${dto.target.user.username}\n・${dto.target.id}`,
                    inline: true
                },
                fields[1]
            ];
        }

        await logs.send({
            embeds: [
                this.responses
                    .getEmbedTemplate(null)
                    .setTitle(`Punishment removed`)
                    .setFields(fields)
            ]
        });
    }
}
