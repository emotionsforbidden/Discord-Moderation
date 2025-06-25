import { GuildMember } from 'discord.js';
import { UserModel } from '@src/libs/common/database/users/User.model';

export interface RemovePunishmentDto {
    executor: GuildMember;
    target: GuildMember | null;
    doc: UserModel;
}
