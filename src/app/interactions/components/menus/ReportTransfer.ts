import { Client, Discord, Guard, SelectMenuComponent } from 'discordx';
import { inject, singleton } from 'tsyringe';
import {
    bold,
    ContainerBuilder,
    MessageFlags,
    TextChannel,
    UserSelectMenuInteraction
} from 'discord.js';
import { ReportResponsibleGuard } from '@src/libs/reports/guards/ReportResponsible.guard';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';
import { ConfigsStorage } from '@config';
import { UsersService } from '@src/libs/users/Users.service';
import { ReportsService } from '@src/libs/reports/Reports.service';

@Discord()
@singleton()
@Guard(ReportResponsibleGuard)
export class ReportTransferMenu {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(ReportsService) private readonly reports: ReportsService,
        @inject(UtilsService) private readonly utils: UtilsService
    ) {}

    @SelectMenuComponent({
        id: /^reportTransfer-/
    })
    public async execute(
        ctx: UserSelectMenuInteraction<'cached'>,
        _client: Client,
        guardData: {
            doc: ReportModel;
            builder: ContainerBuilder;
        }
    ) {
        await ctx.deferReply();

        const member = ctx.members.first();
        const builder = guardData.builder;

        if (!member) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({
                            forceStatic: true
                        }),
                        [
                            `## Report transfer`,
                            `${ctx.user}, Selected member ${bold(`not found`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (member.id === ctx.user.id || member.user.bot) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({
                            forceStatic: true
                        }),
                        [
                            `## Report transfer`,
                            `${ctx.user}, You ${bold(`cannot interact`)} with bot or yourself`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (!ctx.channel) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({
                            forceStatic: true
                        }),
                        [
                            `## Report transfer`,
                            `${ctx.user}, Interaction channel ${bold(`not found`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const target = await this.utils.getMember(
            ctx.guild,
            guardData.doc.targetId
        );
        const canInteract = target
            ? this.reports.canInteract(target, member)
            : this.users.hasRoles(
                  member,
                  this.configs.discord.roles.reports.all,
                  true
              );

        if (!canInteract) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({
                            forceStatic: true
                        }),
                        [
                            `## Report transfer`,
                            `${ctx.user}, ${member} ${bold(`cannot interact`)} with reports`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        guardData.doc.moderatorId = member.id;

        if (!guardData.doc.moderatorsHistory.includes(member.id)) {
            guardData.doc.moderatorsHistory.push(member.id);
        }

        await Promise.allSettled([
            guardData.doc.save(),
            this.utils.editChannelPermissions(
                ctx.channel as TextChannel,
                member.id,
                {
                    ViewChannel: true
                }
            ),
            this.responses.replyWithMessage(
                ctx,
                {
                    components: [
                        this.responses.modifyContainer(
                            builder,
                            member.displayAvatarURL({
                                forceStatic: true
                            }),
                            [
                                `## Report transfer`,
                                `${ctx.user}, You ${bold(`transferred report`)} to ${member}`
                            ]
                        )
                    ],
                    flags: MessageFlags.IsComponentsV2
                },
                false,
                true
            )
        ]);
    }
}
