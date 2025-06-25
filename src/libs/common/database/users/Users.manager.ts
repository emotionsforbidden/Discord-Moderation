import { inject, injectable } from 'tsyringe';
import { Repository } from 'typeorm';
import { UserModel } from '@src/libs/common/database/users/User.model';
import { CustomDatabase } from '@src/libs/common/database/Database';
import { DateService } from '@src/libs/date/Date.service';

@injectable()
export class UsersManager {
    private readonly repository: Repository<UserModel>;

    public constructor(
        @inject(CustomDatabase)
        private readonly database: CustomDatabase,
        @inject(DateService) private readonly date: DateService
    ) {
        this.repository = this.database.getRepository(UserModel);
    }

    public async get(userId: string, guildId: string) {
        const doc = await this.repository.findOneBy({
            userId,
            guildId
        });

        if (doc) {
            return doc;
        }

        return await this.create(userId, guildId);
    }

    private async create(userId: string, guildId: string) {
        const doc = new UserModel();

        doc.userId = userId;
        doc.guildId = guildId;

        await doc.save();

        return doc;
    }

    public async getExpiredMutes() {
        return await this.repository
            .createQueryBuilder('user')
            .where('user.muteInfo IS NOT NULL')
            .andWhere("(user.muteInfo ->> 'expired')::bigint < :now", {
                now: this.date.nowTimestamp()
            })
            .getMany();
    }

    public async getExpiredBans() {
        return await this.repository
            .createQueryBuilder('user')
            .where('user.banInfo IS NOT NULL')
            .andWhere("(user.banInfo ->> 'expired')::bigint < :now", {
                now: this.date.nowTimestamp()
            })
            .getMany();
    }
}
