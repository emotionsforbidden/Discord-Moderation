import { inject, singleton } from 'tsyringe';
import { FindOptionsSelect, Repository } from 'typeorm';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';
import { CustomDatabase } from '@src/libs/common/database/CustomDatabase';
import { SendReportDto } from '@src/libs/reports/dto/SendReportDto';

@singleton()
export class ReportsManager {
    private readonly repository: Repository<ReportModel>;

    public constructor(
        @inject(CustomDatabase) private readonly database: CustomDatabase
    ) {
        this.repository = this.database.getRepository(ReportModel);
    }

    public async alreadyHasRequest(senderId: string, guildId: string) {
        return await this.repository.existsBy({
            senderId,
            guildId
        });
    }

    public async create(dto: SendReportDto) {
        return await this.repository.save(
            this.repository.create({
                senderId: dto.sender.id,
                targetId: dto.target.id,
                guildId: dto.sender.guild.id,
                reason: dto.reason
            })
        );
    }

    public async get(id: number, select?: FindOptionsSelect<ReportModel>) {
        return await this.repository.findOne({
            where: {
                snowflake: {
                    id
                }
            },
            select
        });
    }

    public async deleteNotActive(id: number) {
        return await this.repository.delete({
            snowflake: {
                id
            },
            status: false
        });
    }
}
