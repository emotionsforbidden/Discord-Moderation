import { inject, singleton } from 'tsyringe';
import { FindOptionsSelect, Repository } from 'typeorm';
import { UserModel } from '@src/libs/common/database/users/User.model';
import { CustomDatabase } from '@src/libs/common/database/CustomDatabase';
import { DateService } from '@src/libs/common/date/Date.service';

type PunishmentType = 'textMute' | 'voiceMute' | 'ban';

@singleton()
export class UsersManager {
    private readonly repository: Repository<UserModel>;

    public constructor(
        @inject(CustomDatabase) private readonly database: CustomDatabase,
        @inject(DateService) private readonly date: DateService
    ) {
        this.repository = this.database.getRepository(UserModel);
    }

    public async get(
        userId: string,
        guildId: string,
        select?: FindOptionsSelect<UserModel>
    ) {
        const doc = await this.repository.findOne({
            where: { userId, guildId },
            select
        });

        return doc ?? (await this.create(userId, guildId));
    }

    private async create(userId: string, guildId: string) {
        await this.repository
            .createQueryBuilder()
            .insert()
            .values(this.repository.create({ userId, guildId }))
            .orIgnore()
            .execute();

        return this.repository.findOneOrFail({ where: { userId, guildId } });
    }

    public getExpiredTextMutes() {
        return this.expiredQuery('textMute').getMany();
    }

    public getExpiredVoiceMutes() {
        return this.expiredQuery('voiceMute').getMany();
    }

    public getExpiredBans() {
        return this.expiredQuery('ban')
            .select([
                'user.userId',
                'user.guildId',
                'user.activePunishments',
                'user.snowflakeId'
            ])
            .getMany();
    }

    private expiredQuery(type: PunishmentType) {
        return this.repository
            .createQueryBuilder('user')
            .where(
                `"user"."activePunishments"::jsonb -> :type ->> 'status' = 'true'`,
                { type }
            )
            .andWhere(
                `CAST("user"."activePunishments"::jsonb -> :type ->> 'expiresAt' AS BIGINT) < :now`,
                { type, now: this.date.nowTimestamp() }
            );
    }
}
