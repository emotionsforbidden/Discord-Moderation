import { ReportModel } from '@src/libs/common/database/reports/Report.model';
import { GuildMember, VoiceChannel } from 'discord.js';

export interface CloseReportDto {
    doc: ReportModel;
    channel: VoiceChannel;
    executor: GuildMember;
}
