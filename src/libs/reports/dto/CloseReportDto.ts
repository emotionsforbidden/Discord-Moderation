import { ReportModel } from '@src/libs/common/database/reports/Report.model';
import { GuildMember, TextBasedChannel } from 'discord.js';

export interface CloseReportDto {
    doc: ReportModel;
    executor: GuildMember;
    channel: TextBasedChannel;
}
