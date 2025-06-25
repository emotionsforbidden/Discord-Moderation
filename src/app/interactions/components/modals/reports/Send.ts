import { Discord, Guard, ModalComponent } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ModalSubmitInteraction } from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ReportsService } from '@src/libs/reports/Reports.service';
import { ActiveReportGuard } from '@src/libs/common/discordjs/guards/ActiveReport.guard';

@Discord()
@injectable()
@Guard(ActiveReportGuard)
export class ReportSendModal {
    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(ReportsService) private readonly reports: ReportsService
    ) {}

    @ModalComponent({
        id: /^sendReport-/
    })
    public async execute(ctx: ModalSubmitInteraction<'cached'>) {
        await ctx.deferReply();

        const targetId = this.utils.getParamsFromId(ctx.customId)[1];
        const reason = ctx.fields.getTextInputValue('reason');
        const target = await this.utils.getMember(ctx.guild, targetId);

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Send report')
                        .setDescription('Member **not found**')
                ]
            });
        }

        if (target.user.bot) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Send report')
                        .setDescription('You **cannot interact** with bot')
                ]
            });
        }

        if (target.id === ctx.user.id) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Send report')
                        .setDescription('You **cannot interact** with yourself')
                ]
            });
        }

        const onCooldown = this.reports.onCooldown(ctx.user.id);

        if (onCooldown.checker) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Send report')
                        .setDescription(`You **cannot send** new report now`)
                        .setFields({
                            name: `> Information`,
                            value: `・**Available at:** <t:${Math.trunc(onCooldown.timestamp / 1000)}:f>`
                        })
                ]
            });
        }

        await this.responses.replyWithMessage(ctx, {
            embeds: [
                this.responses
                    .getEmbedTemplate(ctx.member.displayAvatarURL())
                    .setTitle('Send report')
                    .setDescription(
                        `You've sent a report to ${target} with reason \`${reason}\`, **wait for answer** from moderation`
                    )
            ]
        });

        return await this.reports.send({
            sender: ctx.member,
            target,
            reason
        });
    }
}
