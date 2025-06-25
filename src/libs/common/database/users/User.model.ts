import { BaseEntity, Column, Entity, Index } from 'typeorm';
import { SnowflakeIdModel } from '@src/libs/common/database/SnowflakeIdModel';
import type { IPunishment } from '@src/libs/moderation/interfaces/Punishment';

@Entity({ name: 'users' })
export class UserModel extends BaseEntity {
    @Column(() => SnowflakeIdModel)
    public snowflake: SnowflakeIdModel;

    @Index()
    @Column({ type: 'text', unique: true })
    public userId: string;

    @Index()
    @Column({ type: 'text' })
    public guildId: string;

    @Column({ type: 'jsonb', default: null })
    public muteInfo: IPunishment | null;

    @Column({ type: 'jsonb', default: null })
    public banInfo: IPunishment | null;

    @Column({ type: 'int4', default: 0 })
    public warnsInfo: number;

    @Column({ type: 'jsonb', default: [] })
    public history: IPunishment[];
}
