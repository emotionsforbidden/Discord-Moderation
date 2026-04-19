import { GuildMember } from 'discord.js';
import { UserModel } from '@src/libs/common/database/users/User.model';

export interface ExecutePunishmentDto {
    target: GuildMember;
    executor: GuildMember;
    doc: UserModel;
    endsAt: number;
    reason: string;
}
