import { BaseEntity, Column, Entity, Index } from 'typeorm';
import { SnowflakeIdModel } from '@src/libs/common/database/SnowflakeIdModel';

@Index(['senderId', 'guildId'], { unique: true })
@Entity({ name: 'reports' })
export class ReportModel extends BaseEntity {
    @Column(() => SnowflakeIdModel)
    public snowflake: SnowflakeIdModel;

    @Column({ type: 'text' })
    public senderId: string;

    @Column({ type: 'text' })
    public guildId: string;

    @Column({ type: 'text', nullable: true })
    public moderatorId: string | null;

    @Column({ type: 'text' })
    public targetId: string;

    @Column({ type: 'text' })
    public reason: string;

    @Column({ type: 'jsonb', default: [] })
    public moderatorsHistory: string[];

    @Column({ type: 'boolean', default: false })
    public status: boolean;

    @Column({ type: 'jsonb', default: [] })
    public addedUsers: string[];

    @Column({ type: 'text', nullable: true })
    public link: string;
}
