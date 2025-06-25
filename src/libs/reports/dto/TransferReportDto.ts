import { ReportModel } from '@src/libs/common/database/reports/Report.model';
import { GuildMember, VoiceChannel } from 'discord.js';

export interface TransferReportDto {
    doc: ReportModel;
    member: GuildMember;
    channel: VoiceChannel;
}
