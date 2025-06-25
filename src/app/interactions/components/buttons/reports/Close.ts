import { ButtonComponent, Discord, Guard } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ButtonInteraction, VoiceChannel } from 'discord.js';
import { ReportsService } from '@src/libs/reports/Reports.service';
import { ReportInteractGuard } from '@src/libs/common/discordjs/guards/ReportInteract.guard';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';

@Discord()
@injectable()
@Guard(ReportInteractGuard)
export class ReportCloseButton {
    public constructor(
        @inject(ReportsService) private readonly reports: ReportsService
    ) {}

    @ButtonComponent({
        id: /^closeReport-/
    })
    public async execute(
        ctx: ButtonInteraction<'cached'>,
        _client: CustomClient,
        guardData: { doc: ReportModel }
    ) {
        await ctx.deferUpdate();

        return await this.reports.close({
            executor: ctx.member,
            doc: guardData.doc,
            channel: ctx.channel as VoiceChannel
        });
    }
}
