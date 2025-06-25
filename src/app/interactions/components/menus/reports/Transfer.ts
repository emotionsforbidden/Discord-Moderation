import { Discord, Guard, SelectMenuComponent } from 'discordx';
import { inject, injectable } from 'tsyringe';
import {
    MessageFlags,
    UserSelectMenuInteraction,
    VoiceChannel
} from 'discord.js';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ModerationService } from '@src/libs/moderation/Moderation.service';
import { ReportInteractGuard } from '@src/libs/common/discordjs/guards/ReportInteract.guard';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';
import { ReportsService } from '@src/libs/reports/Reports.service';

@Discord()
@injectable()
@Guard(ReportInteractGuard)
export class ReportTransferMenu {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(ModerationService)
        private readonly moderation: ModerationService,
        @inject(ReportsService) private readonly reports: ReportsService
    ) {}

    @SelectMenuComponent({
        id: /^transferReport-/
    })
    public async execute(
        ctx: UserSelectMenuInteraction<'cached'>,
        _client: CustomClient,
        guardData: { doc: ReportModel }
    ) {
        await ctx.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const member = ctx.members.first();

        if (!member) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle(`Transfer report`)
                        .setDescription(`Member **not found**`)
                ]
            });
        }

        const canInteract = this.moderation.canInteract(member);

        if (!canInteract) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle(`Transfer report`)
                        .setDescription(
                            `Member **doesn't have access** to reports`
                        )
                ]
            });
        }

        if (guardData.doc.responsibleId === member.id) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle(`Transfer report`)
                        .setDescription(
                            `Member **already has access** to this report`
                        )
                ]
            });
        }

        await this.responses.replyWithMessage(ctx, {
            embeds: [
                this.responses
                    .getEmbedTemplate(ctx.member.displayAvatarURL())
                    .setTitle(`Transfer report`)
                    .setDescription(
                        `You **transferred** this **ticket** to ${member}`
                    )
            ]
        });

        return await this.reports.transfer({
            doc: guardData.doc,
            member,
            channel: ctx.channel as VoiceChannel
        });
    }
}
