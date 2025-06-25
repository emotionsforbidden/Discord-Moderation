import { GuildMember, ModalSubmitInteraction } from 'discord.js';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';

export interface DeclineReportDto {
    sender: GuildMember | null;
    doc: ReportModel;
    executor: GuildMember;
    ctx: ModalSubmitInteraction<'cached'>;
    reason: string;
}
