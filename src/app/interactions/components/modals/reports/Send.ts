import { Discord, ModalComponent } from 'discordx';
import { inject, singleton } from 'tsyringe';
import {
    bold,
    ContainerBuilder,
    MessageFlags,
    ModalSubmitInteraction
} from 'discord.js';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ReportsManager } from '@src/libs/common/database/reports/Reports.manager';
import { ReportsService } from '@src/libs/reports/Reports.service';

@Discord()
@singleton()
export class ReportSendModal {
    public constructor(
        @inject(ReportsManager)
        private readonly reportsDatabase: ReportsManager,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(ReportsService) private readonly reports: ReportsService
    ) {}

    @ModalComponent({
        id: `reportSend`
    })
    public async execute(ctx: ModalSubmitInteraction<'cached'>) {
        await ctx.deferReply();

        const reason = ctx.fields.getTextInputValue('reason');
        const member = ctx.fields.getSelectedMembers(`member`)?.first();
        const builder = new ContainerBuilder();

        if (!member) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Report send`,
                            `${ctx.user}, Selected member ${bold(`not found`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (member.user.bot || member.id === ctx.user.id) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Report send`,
                            `${ctx.user}, You cannot interact ${bold(`with yourself or bot`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const alreadyHasRequest = await this.reportsDatabase.alreadyHasRequest(
            ctx.user.id,
            ctx.guildId
        );

        if (alreadyHasRequest) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Report send`,
                            `${ctx.user}, You already have ${bold(`active report`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const result = await this.reports.send({
            reason,
            sender: ctx.member,
            target: member
        });

        if (!result) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Report send`,
                            `${ctx.user}, Cannot send report ${bold(`due to error`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        await this.responses.replyWithMessage(ctx, {
            components: [
                this.responses.modifyContainer(
                    builder,
                    member.displayAvatarURL({ forceStatic: true }),
                    [
                        `## Report send`,
                        `${ctx.user}, You've ${bold(`sent report`)} to moderators`
                    ]
                )
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
