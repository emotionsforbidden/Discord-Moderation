import { GuildMember } from 'discord.js';
import { UserModel } from '@src/libs/common/database/users/User.model';

export interface PunishmentDto {
    executor: GuildMember;
    target: GuildMember;
    doc: UserModel;
    reason: string;
    duration?: number;
}
