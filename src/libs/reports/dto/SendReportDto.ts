import { GuildMember } from 'discord.js';

export interface SendReportDto {
    target: GuildMember;
    sender: GuildMember;
    reason: string;
}
