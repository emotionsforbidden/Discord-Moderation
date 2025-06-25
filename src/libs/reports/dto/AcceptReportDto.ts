import { ButtonInteraction, GuildMember } from 'discord.js';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';

export interface AcceptReportDto {
    executor: GuildMember;
    sender: GuildMember;
    doc: ReportModel;
    ctx: ButtonInteraction<'cached'>;
}
