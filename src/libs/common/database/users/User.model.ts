import { BaseEntity, Column, Entity, Index } from 'typeorm';
import { SnowflakeIdModel } from '@src/libs/common/database/SnowflakeIdModel';
import { IPunishmentInfo } from '@src/libs/moderation/interfaces/PunishmentInfo';
import {
    DefaultActivePunishments,
    IActivePunishments
} from '@src/libs/moderation/interfaces/ActivePunishments';

@Index(['userId', 'guildId'], { unique: true })
@Entity({ name: 'users' })
export class UserModel extends BaseEntity {
    @Column(() => SnowflakeIdModel)
    public snowflake: SnowflakeIdModel;

    @Column({ type: 'text' })
    public userId: string;

    @Column({ type: 'text' })
    public guildId: string;

    @Column({ type: 'jsonb', default: [] })
    public punishments: IPunishmentInfo[];

    @Column({
        type: 'jsonb',
        default: DefaultActivePunishments
    })
    public activePunishments: IActivePunishments;
}
