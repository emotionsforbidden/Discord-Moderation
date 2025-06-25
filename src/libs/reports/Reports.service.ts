import {
    APIEmbedField,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    Collection,
    Colors,
    OverwriteType,
    PermissionFlagsBits,
    TextChannel,
    UserSelectMenuBuilder,
    VoiceChannel
} from 'discord.js';
import { inject, injectable } from 'tsyringe';
import { DateService } from '@src/libs/date/Date.service';
import { SendReportDto } from '@src/libs/reports/dto/SendReportDto';
import { ConfigsStorage } from '@config';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import ms from 'ms';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ReportsManager } from '@src/libs/common/database/reports/Reports.manager';
import { AcceptReportDto } from '@src/libs/reports/dto/AcceptReportDto';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { DeclineReportDto } from '@src/libs/reports/dto/DeclineReportDto';
import { CloseReportDto } from '@src/libs/reports/dto/CloseReportDto';
import { TransferReportDto } from '@src/libs/reports/dto/TransferReportDto';
import { LogsService } from '@src/libs/logs/Logs.service';

@injectable()
export class ReportsService {
    private readonly configs = ConfigsStorage;

    private readonly cache: Collection<string, number>;

    public constructor(
        @inject(DateService) private readonly date: DateService,
        @inject(CustomLogger) private readonly logger: CustomLogger,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(ReportsManager)
        private readonly reportsDatabase: ReportsManager,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(LogsService) private readonly logs: LogsService
    ) {
        this.cache = new Collection<string, number>();
    }

    public onCooldown(memberId: string) {
        const cooldownTimestamp = this.cache.get(memberId) ?? 0;
        const nowTimestamp = this.date.nowTimestamp();

        return {
            checker: cooldownTimestamp > nowTimestamp,
            timestamp: cooldownTimestamp
        };
    }

    private addToCache(senderId: string) {
        this.cache.set(senderId, this.date.nowTimestamp() + ms('15m'));
    }

    public async send(dto: SendReportDto) {
        const reportsChannel = await this.utils.getChannel<TextChannel>(
            dto.sender.guild,
            this.configs.discord.channels.reports
        );

        if (!reportsChannel || !reportsChannel.isSendable()) {
            this.logger.log(LogLevel.WARN, `Unknown channel for reports`);
            return;
        }

        const doc = await this.reportsDatabase.create(dto);

        await reportsChannel.send({
            embeds: [
                this.responses
                    .getEmbedTemplate(dto.sender.displayAvatarURL())
                    .setTitle(`New report`)
                    .setFields([
                        {
                            name: `> Sender`,
                            value: `・${dto.sender}\n・${dto.sender.user.username}\n・${dto.sender.id}`,
                            inline: true
                        },
                        {
                            name: `> Target`,
                            value: `・${dto.target}\n・${dto.target.user.username}\n・${dto.target.id}`,
                            inline: true
                        },
                        {
                            name: `> Reason`,
                            value: `\`\`\`${dto.reason}\`\`\``,
                            inline: false
                        }
                    ])
            ],
            components: [
                this.responses.getMessageRowTemplate([
                    new ButtonBuilder()
                        .setLabel('Accept')
                        .setStyle(ButtonStyle.Success)
                        .setCustomId(`acceptReport-${doc.snowflake.id}`),

                    new ButtonBuilder()
                        .setLabel('Decline')
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId(`declineReport-${doc.snowflake.id}`)
                ])
            ]
        });
        this.addToCache(dto.sender.id);
    }

    public async accept(dto: AcceptReportDto) {
        if (!dto.ctx.channel) {
            return;
        }

        const channel = (await this.utils.createChannel(dto.ctx.guild, {
            name: `report・${dto.sender.user.username}`,
            type: ChannelType.GuildVoice,
            parent: dto.ctx.channel.parentId,
            permissionOverwrites: [
                {
                    id: dto.sender.id,
                    type: OverwriteType.Member,
                    allow: this.getChannelPermissionsForMember()
                },
                {
                    id: dto.executor.id,
                    type: OverwriteType.Member,
                    allow: this.getChannelPermissionsForMember()
                },
                {
                    id: dto.ctx.guildId,
                    type: OverwriteType.Role,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
            ]
        })) as VoiceChannel | null;

        if (!channel) {
            return;
        }

        dto.doc.active = true;
        dto.doc.responsibleId = dto.executor.id;
        dto.doc.takenHistory.push(dto.executor.id);
        dto.doc.channelId = channel.id;
        await dto.doc.save();

        await this.responses.replyWithMessage(dto.ctx, {
            embeds: [
                this.responses
                    .cloneEmbed(dto.ctx.message.embeds[0].data)
                    .setColor(Colors.Green)
                    .setFooter({
                        iconURL: dto.executor.displayAvatarURL(),
                        text: `・Accepted by: ${dto.executor.user.username}`
                    })
            ],
            components: [
                this.responses.getMessageRowTemplate([
                    new ButtonBuilder()
                        .setLabel(`Go to the channel`)
                        .setStyle(ButtonStyle.Link)
                        .setURL(
                            `https://discord.com/channels/${dto.ctx.guildId}/${channel.id}`
                        )
                ])
            ]
        });

        await this.reportManagePanel(
            channel,
            dto.ctx.message.embeds[0].fields,
            dto.doc.snowflake.id
        );
    }

    public async decline(dto: DeclineReportDto) {
        await dto.doc.remove();

        if (dto.ctx.message) {
            await this.responses.replyWithMessage(dto.ctx, {
                embeds: [
                    this.responses
                        .cloneEmbed(dto.ctx.message.embeds[0].data)
                        .setColor(Colors.Red)
                        .setFooter({
                            iconURL: dto.executor.displayAvatarURL(),
                            text: `・Declined by: ${dto.executor.user.username}\n・Reason: ${dto.reason}`
                        })
                ],
                components: []
            });
        }

        if (dto.sender) {
            try {
                await dto.sender.send({
                    embeds: [
                        this.responses
                            .getEmbedTemplate(dto.sender.displayAvatarURL())
                            .setTitle(`Moderation declined your report`)
                            .setFields([
                                {
                                    name: `> Moderator`,
                                    value: `・${dto.executor}\n・${dto.executor.user.username}\n・${dto.executor.id}`,
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
            } catch (error) {
                this.logger.handleError(
                    error,
                    `Cannot send message to member with ID ${dto.sender.id}`
                );
            }
        }
    }

    private async reportManagePanel(
        channel: VoiceChannel,
        fields: APIEmbedField[],
        docId: number
    ) {
        await channel.send({
            embeds: [
                this.responses
                    .getEmbedTemplate(channel.guild.iconURL())
                    .setTitle(`Report manage`)
                    .setDescription(
                        `Use **buttons below** to manage with report`
                    )
                    .setFields(fields)
            ],
            components: [
                this.responses.getMessageRowTemplate([
                    new UserSelectMenuBuilder()
                        .setPlaceholder('Transfer report')
                        .setCustomId(`transferReport-${docId}`)
                ]),

                this.responses.getMessageRowTemplate([
                    new ButtonBuilder()
                        .setLabel(`Move target`)
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId(`moveTargetReport-${docId}`),

                    new ButtonBuilder()
                        .setLabel(`Close report`)
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId(`closeReport-${docId}`)
                ])
            ]
        });
    }

    public async close(dto: CloseReportDto) {
        await dto.doc.remove();
        try {
            await dto.channel.delete();
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot delete channel with ID ${dto.channel.id}`
            );
        }

        await this.logs.reportCloseLog(dto);
    }

    public async transfer(dto: TransferReportDto) {
        dto.doc.responsibleId = dto.member.id;
        if (!dto.doc.takenHistory.includes(dto.member.id)) {
            dto.doc.takenHistory.push(dto.member.id);
        }
        await dto.doc.save();

        try {
            await dto.channel.permissionOverwrites.set([
                ...dto.channel.permissionOverwrites.cache.values(),
                {
                    id: dto.member.id,
                    type: OverwriteType.Member,
                    allow: this.getChannelPermissionsForMember()
                }
            ]);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot edit permissions to channel with ID ${dto.channel.id}`
            );
        }
    }

    private getChannelPermissionsForMember() {
        return [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory
        ];
    }
}
