import { GuildMember } from 'discord.js';
import { IPage } from '@src/libs/utils/interfaces/Page';
import { IPunishment } from '@src/libs/moderation/interfaces/Punishment';

export interface GenerateHistoryPageDto {
    executor: GuildMember;
    member: GuildMember;
    pageNumber?: number;
    page: IPage<IPunishment>;
}
