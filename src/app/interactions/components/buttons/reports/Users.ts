import { ButtonComponent, Client, Discord, Guard } from 'discordx';
import { inject, singleton } from 'tsyringe';
import {
    bold,
    ButtonInteraction,
    ContainerBuilder,
    GuildMember,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder,
    TextChannel,
    userMention,
    UserSelectMenuBuilder,
    UserSelectMenuInteraction
} from 'discord.js';
import ms from 'ms';
import { ReportResponsibleGuard } from '@src/libs/reports/guards/ReportResponsible.guard';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';

@Discord()
@singleton()
@Guard(ReportResponsibleGuard)
export class ReportUsersButton {
    private renderPage(
        member: GuildMember,
        builder: ContainerBuilder,
        items: string[],
        options: StringSelectMenuOptionBuilder[]
    ) {
        return this.responses
            .modifyContainer(
                builder,
                member.displayAvatarURL({ forceStatic: true }),
                [
                    `## Discussion members`,
                    items
                        .map((id, index) => `${index + 1}. ${userMention(id)}`)
                        .join(`\n`) || `${bold(`List`)} is ${bold(`empty`)}`
                ]
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(false)
                    .setSpacing(SeparatorSpacingSize.Small)
            )
            .addActionRowComponents((actionRow) =>
                actionRow.setComponents(
                    new UserSelectMenuBuilder()
                        .setPlaceholder(`Select member to add`)
                        .setCustomId(`reportUsersAdd`)
                        .setDisabled(items.length >= 20)
                )
            )
            .addActionRowComponents((actionRow) =>
                actionRow.setComponents(
                    new StringSelectMenuBuilder()
                        .setPlaceholder(`Select member to remove`)
                        .setCustomId(`reportUsersRemove`)
                        .setDisabled(!items.length)
                        .setOptions(options)
                )
            );
    }

    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService
    ) {}

    @ButtonComponent({
        id: /^reportUsers-/
    })
    public async execute(
        ctx: ButtonInteraction<'cached'>,
        _client: Client,
        guardData: {
            doc: ReportModel;
            builder: ContainerBuilder;
        }
    ) {
        let [interactionCallback, options] = await Promise.all([
            ctx.deferReply({
                flags: MessageFlags.Ephemeral,
                withResponse: true
            }),
            this.utils.renderMembersOptions(ctx.guild, guardData.doc.addedUsers)
        ]);
        let builder = guardData.builder;

        await this.responses.replyWithMessage(ctx, {
            components: [
                this.renderPage(
                    ctx.member,
                    builder,
                    guardData.doc.addedUsers,
                    options
                )
            ],
            flags: MessageFlags.IsComponentsV2
        });

        if (interactionCallback.resource?.message) {
            const collector =
                interactionCallback.resource.message.createMessageComponentCollector(
                    {
                        time: ms('15m'),
                        idle: ms('3m')
                    }
                );

            collector.on('collect', async (collected) => {
                await collected.deferUpdate();

                builder = new ContainerBuilder();

                switch (collected.customId) {
                    case 'reportUsersAdd': {
                        const member = (
                            collected as UserSelectMenuInteraction<'cached'>
                        ).members.first();

                        if (!member) {
                            return await this.responses.replyWithMessage(
                                collected,
                                {
                                    components: [
                                        this.responses.modifyContainer(
                                            builder,
                                            collected.user.displayAvatarURL({
                                                forceStatic: true
                                            }),
                                            [
                                                `## Discussion members`,
                                                `${collected.user}, Selected member ${bold(`not found`)}`
                                            ]
                                        )
                                    ],
                                    flags: [
                                        MessageFlags.IsComponentsV2,
                                        MessageFlags.Ephemeral
                                    ]
                                },
                                true
                            );
                        }

                        if (
                            member.user.bot ||
                            member.id === collected.user.id
                        ) {
                            return await this.responses.replyWithMessage(
                                collected,
                                {
                                    components: [
                                        this.responses.modifyContainer(
                                            builder,
                                            collected.user.displayAvatarURL({
                                                forceStatic: true
                                            }),
                                            [
                                                `## Discussion members`,
                                                `${collected.user}, You ${bold(`cannot interact`)} with bot or yourself`
                                            ]
                                        )
                                    ],
                                    flags: [
                                        MessageFlags.IsComponentsV2,
                                        MessageFlags.Ephemeral
                                    ]
                                },
                                true
                            );
                        }

                        const ids = new Set(guardData.doc.addedUsers);

                        if (ids.has(member.id)) {
                            return await this.responses.replyWithMessage(
                                collected,
                                {
                                    components: [
                                        this.responses.modifyContainer(
                                            builder,
                                            collected.user.displayAvatarURL({
                                                forceStatic: true
                                            }),
                                            [
                                                `## Discussion members`,
                                                `${collected.user}, ${member} is ${bold(`already added`)} to discussion`
                                            ]
                                        )
                                    ],
                                    flags: [
                                        MessageFlags.IsComponentsV2,
                                        MessageFlags.Ephemeral
                                    ]
                                },
                                true
                            );
                        }

                        ids.add(member.id);
                        options.push(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(member.displayName)
                                .setValue(member.id)
                        );

                        const nullOptionIndex = options.findIndex(
                            (option) => option.data.value === 'null'
                        );

                        if (nullOptionIndex !== -1) {
                            options.splice(nullOptionIndex, 1);
                        }
                        guardData.doc.addedUsers = Array.from(ids);

                        await Promise.all([
                            guardData.doc.save(),
                            this.utils.editChannelPermissions(
                                collected.channel as TextChannel,
                                member.id,
                                {
                                    ViewChannel: true
                                }
                            ),
                            this.responses.replyWithMessage(collected, {
                                components: [
                                    this.renderPage(
                                        collected.member,
                                        builder,
                                        guardData.doc.addedUsers,
                                        options
                                    )
                                ]
                            })
                        ]);
                        break;
                    }
                    case 'reportUsersRemove': {
                        const memberId = (
                            collected as StringSelectMenuInteraction<'cached'>
                        ).values[0];
                        const member = await this.utils.getMember(
                            collected.guild,
                            memberId
                        );

                        if (!member) {
                            return await this.responses.replyWithMessage(
                                collected,
                                {
                                    components: [
                                        this.responses.modifyContainer(
                                            builder,
                                            collected.user.displayAvatarURL({
                                                forceStatic: true
                                            }),
                                            [
                                                `## Discussion members`,
                                                `${collected.user}, Selected member ${bold(`not found`)}`
                                            ]
                                        )
                                    ],
                                    flags: [
                                        MessageFlags.IsComponentsV2,
                                        MessageFlags.Ephemeral
                                    ]
                                },
                                true
                            );
                        }

                        if (member.id === collected.user.id) {
                            return await this.responses.replyWithMessage(
                                collected,
                                {
                                    components: [
                                        this.responses.modifyContainer(
                                            builder,
                                            collected.user.displayAvatarURL({
                                                forceStatic: true
                                            }),
                                            [
                                                `## Discussion members`,
                                                `${collected.user}, You cannot interact ${bold(`with yourself`)}`
                                            ]
                                        )
                                    ],
                                    flags: [
                                        MessageFlags.IsComponentsV2,
                                        MessageFlags.Ephemeral
                                    ]
                                },
                                true
                            );
                        }

                        const ids = new Set(guardData.doc.addedUsers);

                        if (!ids.has(memberId)) {
                            return await this.responses.replyWithMessage(
                                collected,
                                {
                                    components: [
                                        this.responses.modifyContainer(
                                            builder,
                                            collected.user.displayAvatarURL({
                                                forceStatic: true
                                            }),
                                            [
                                                `## Discussion members`,
                                                `${collected.user}, ${member} is ${bold(`not added`)} to discussion`
                                            ]
                                        )
                                    ],
                                    flags: [
                                        MessageFlags.IsComponentsV2,
                                        MessageFlags.Ephemeral
                                    ]
                                },
                                true
                            );
                        }

                        const optionIndex = options.findIndex(
                            (option) => option.data.value === memberId
                        );

                        if (optionIndex === -1) {
                            return await this.responses.replyWithMessage(
                                collected,
                                {
                                    components: [
                                        this.responses.modifyContainer(
                                            builder,
                                            collected.user.displayAvatarURL({
                                                forceStatic: true
                                            }),
                                            [
                                                `## Discussion members`,
                                                `${collected.user}, ${member} is ${bold(`not added`)} to discussion`
                                            ]
                                        )
                                    ],
                                    flags: [
                                        MessageFlags.IsComponentsV2,
                                        MessageFlags.Ephemeral
                                    ]
                                },
                                true
                            );
                        }

                        ids.delete(memberId);
                        guardData.doc.addedUsers = Array.from(ids);
                        ids.size
                            ? options.splice(optionIndex, 1)
                            : (options = await this.utils.renderMembersOptions(
                                  collected.guild,
                                  guardData.doc.addedUsers
                              ));

                        await Promise.all([
                            guardData.doc.save(),
                            this.utils.deleteChannelPermissions(
                                collected.channel as TextChannel,
                                memberId
                            ),
                            this.responses.replyWithMessage(collected, {
                                components: [
                                    this.renderPage(
                                        collected.member,
                                        builder,
                                        guardData.doc.addedUsers,
                                        options
                                    )
                                ]
                            })
                        ]);
                        break;
                    }
                }
            });

            collector.once('end', async () => {
                try {
                    if (interactionCallback.resource?.message) {
                        await ctx.deleteReply(
                            interactionCallback.resource.message
                        );
                    }
                } catch {
                    return null;
                }
            });
        }
    }
}
