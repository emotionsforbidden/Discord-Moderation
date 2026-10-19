import { ButtonComponent, Discord } from 'discordx';
import { inject, singleton } from 'tsyringe';
import {
    ActionRowBuilder,
    bold,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ContainerBuilder,
    ContainerComponent,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder
} from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ReportsService } from '@src/libs/reports/Reports.service';
import { ReportsManager } from '@src/libs/common/database/reports/Reports.manager';

@Discord()
@singleton()
export class ReportAcceptButton {
    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(ReportsManager)
        private readonly reportsDatabase: ReportsManager,
        @inject(ReportsService) private readonly reports: ReportsService
    ) {}

    @ButtonComponent({
        id: /^reportAccept-/
    })
    public async execute(ctx: ButtonInteraction<'cached'>) {
        await ctx.deferUpdate();

        const docId = Number(this.utils.getParamsFromId(ctx.customId)[1]);
        const builder = new ContainerBuilder();

        if (!ctx.message) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Report accept`,
                                `${ctx.user}, Interaction message ${bold(`not found`)}`
                            ]
                        )
                    ],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                },
                true
            );
        }

        const doc = await this.reportsDatabase.get(docId);

        if (!doc) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Report accept`,
                                `${ctx.user}, Selected report ${bold(`not found`)}`
                            ]
                        )
                    ],
                    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                },
                true
            );
        }

        if (doc.status) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Report accept`,
                                `${ctx.user}, Selected report ${bold(`already taken`)}`
                            ]
                        )
                    ],
                    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
                },
                true
            );
        }

        const target = await this.utils.getMember(ctx.guild, doc.targetId);

        if (!target) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Report accept`,
                                [
                                    `${ctx.user}, ${bold(`Target`)} from report ${bold(`not found`)}`,
                                    `${bold(`only decline`)} available`
                                ].join(`\n`)
                            ]
                        )
                    ],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                },
                true
            );
        }

        const hasAccessToReports = this.reports.canInteract(target, ctx.member);

        if (!hasAccessToReports) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Report accept`,
                                `${ctx.user}, You ${bold(`don't have access`)} to reports`
                            ]
                        )
                    ],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                },
                true
            );
        }

        const sender = await this.utils.getMember(ctx.guild, doc.senderId);

        if (!sender) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Report accept`,
                                [
                                    `${ctx.user}, ${bold(`Sender`)} from report ${bold(`not found`)}`,
                                    `${bold(`only decline`)} available`
                                ].join(`\n`)
                            ]
                        )
                    ],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                },
                true
            );
        }

        const container = (ctx.message.components[1] ||
            ctx.message.components[0]) as ContainerComponent;
        const copyBuilder = new ContainerBuilder(container.toJSON());
        const result = await this.reports.accept({
            doc,
            sender,
            moderator: ctx.member,
            builder: container
        });

        if (!result) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Report accept`,
                                `${ctx.user}, Cannot accept report ${bold(`due to error`)}`
                            ]
                        )
                    ],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                },
                true
            );
        }

        copyBuilder.spliceComponents(container.components.length - 1, 1, [
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(
                        ctx.user.displayAvatarURL({ forceStatic: true })
                    )
                )
                .addTextDisplayComponents(
                    [
                        `## Accepted:`,
                        [
                            `- ${ctx.user}`,
                            `- ${ctx.user.username}`,
                            `- ${ctx.user.id}`
                        ].join(`\n`)
                    ].map((value) => new TextDisplayBuilder().setContent(value))
                ),

            new SeparatorBuilder()
                .setDivider(true)
                .setSpacing(SeparatorSpacingSize.Large),

            new ActionRowBuilder<ButtonBuilder>().setComponents(
                new ButtonBuilder()
                    .setLabel(`Go to discussion`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(result)
            )
        ]);

        await this.responses.replyWithMessage(ctx, {
            components: [copyBuilder]
        });
    }
}
