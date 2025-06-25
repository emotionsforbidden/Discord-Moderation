import { UserModel } from '@src/libs/common/database/users/User.model';
import { GuildMember } from 'discord.js';

export interface GenerateModPanelDto {
    doc: UserModel;
    target: GuildMember;
    targetIsStaff: boolean;
}
