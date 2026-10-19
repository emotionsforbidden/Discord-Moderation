import { ContainerComponent, GuildMember } from 'discord.js';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';

export interface AcceptReportDto {
    doc: ReportModel;
    moderator: GuildMember;
    sender: GuildMember;
    builder: ContainerComponent;
}
