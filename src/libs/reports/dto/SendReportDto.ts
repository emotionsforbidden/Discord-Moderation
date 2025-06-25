import { GuildMember } from 'discord.js';

export interface SendReportDto {
    sender: GuildMember;
    target: GuildMember;
    reason: string;
}
