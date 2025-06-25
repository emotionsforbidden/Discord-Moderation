import { Entity, Column, BaseEntity, Index } from 'typeorm';
import { SnowflakeIdModel } from '@src/libs/common/database/SnowflakeIdModel';

@Entity({ name: 'reports' })
export class ReportModel extends BaseEntity {
    @Column(() => SnowflakeIdModel)
    public snowflake: SnowflakeIdModel;

    @Index()
    @Column({ type: 'text' })
    public senderId: string;

    @Column({ type: 'text' })
    public targetId: string;

    @Column({ type: 'jsonb', default: [] })
    public takenHistory: string[];

    @Column({ type: 'text', nullable: true })
    public responsibleId: string;

    @Column({ type: 'boolean', default: false })
    public active: boolean;

    @Column({ type: 'text' })
    public reason: string;

    @Column({ type: 'text', nullable: true })
    public channelId: string;
}
