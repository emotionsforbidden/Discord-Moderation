import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export class SnowflakeIdModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @CreateDateColumn()
    public createdAt: number;
}
