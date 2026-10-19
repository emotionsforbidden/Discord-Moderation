import { Discord, ModalComponent } from 'discordx';
import { inject, singleton } from 'tsyringe';
import {
    bold,
    codeBlock,
    ContainerBuilder,
    ContainerComponent,
    MessageFlags,
    ModalSubmitInteraction,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder
} from 'discord.js';
import { ConfigsStorage } from '@config';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ReportsManager } from '@src/libs/common/database/reports/Reports.manager';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UsersService } from '@src/libs/users/Users.service';
import { ReportsService } from '@src/libs/reports/Reports.service';

@Discord()
@singleton()
export class ReportDeclineModal {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ReportsManager)
        private readonly reportsDatabase: ReportsManager,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(ReportsService) private readonly reports: ReportsService
    ) {}

    @ModalComponent({
        id: /^reportDecline-/
    })
    public async execute(ctx: ModalSubmitInteraction<'cached'>) {
        await ctx.deferUpdate();

        const docId = Number(this.utils.getParamsFromId(ctx.customId)[1]);
        const reason = ctx.fields.getTextInputValue('reason');
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
                                `## Report decline`,
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
                                `## Report decline`,
                                `${ctx.user}, Selected report ${bold(`not found`)}`
                            ]
                        )
                    ],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
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
                                `## Report decline`,
                                `${ctx.user}, Selected report ${bold(`already taken`)}`
                            ]
                        )
                    ],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                },
                true
            );
        }

        const target = await this.utils.getMember(ctx.guild, doc.targetId);
        const hasAccessToReports = target
            ? this.reports.canInteract(target, ctx.member)
            : this.users.hasRoles(
                  ctx.member,
                  this.configs.discord.roles.reports.all,
                  true
              );

        if (!hasAccessToReports) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Report decline`,
                                `${ctx.user}, You ${bold(`don't have access`)} to reports`
                            ]
                        )
                    ],
                    flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
                },
                true
            );
        }

        const result = await this.reportsDatabase.deleteNotActive(docId);

        if (!result.affected) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Report decline`,
                                `${ctx.user}, Report ${bold(`not found`)} or ${bold(`already taken`)}`
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

        copyBuilder.spliceComponents(container.components.length - 1, 1, [
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(
                        ctx.user.displayAvatarURL({ forceStatic: true })
                    )
                )
                .addTextDisplayComponents(
                    [
                        `## Declined:`,
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

            ...[`## Reason:`, codeBlock(reason)].map((value) =>
                new TextDisplayBuilder().setContent(value)
            )
        ]);

        await this.responses.replyWithMessage(ctx, {
            components: [copyBuilder]
        })
    }
}
