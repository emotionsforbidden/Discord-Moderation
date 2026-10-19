import { ButtonComponent, Client, Discord, Guard } from 'discordx';
import { inject, singleton } from 'tsyringe';
import { ButtonInteraction } from 'discord.js';
import { ReportResponsibleGuard } from '@src/libs/reports/guards/ReportResponsible.guard';
import { ReportsService } from '@src/libs/reports/Reports.service';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';

@Discord()
@singleton()
@Guard(ReportResponsibleGuard)
export class ReportCloseButton {
    public constructor(
        @inject(ReportsService)
        private readonly reports: ReportsService
    ) {}

    @ButtonComponent({
        id: /^reportClose-/
    })
    public async execute(
        ctx: ButtonInteraction<'cached'>,
        _client: Client,
        guardData: {
            doc: ReportModel;
        }
    ) {
        if (!ctx.channel) {
            return;
        }

        await Promise.allSettled([
            ctx.deferUpdate(),
            this.reports.close({
                doc: guardData.doc,
                executor: ctx.member,
                channel: ctx.channel
            })
        ]);
    }
}
