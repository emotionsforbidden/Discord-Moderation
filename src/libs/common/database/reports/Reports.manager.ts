import { Repository } from 'typeorm';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';
import { inject, injectable } from 'tsyringe';
import { CustomDatabase } from '@src/libs/common/database/Database';
import { SendReportDto } from '@src/libs/reports/dto/SendReportDto';

@injectable()
export class ReportsManager {
    private readonly repository: Repository<ReportModel>;

    public constructor(
        @inject(CustomDatabase) private readonly database: CustomDatabase
    ) {
        this.repository = this.database.getRepository(ReportModel);
    }

    public async getActiveReportBySender(senderId: string) {
        return await this.repository.findOneBy({
            senderId,
            active: true
        });
    }

    public async getById(id: number) {
        return await this.repository.findOneBy({
            snowflake: {
                id
            }
        });
    }

    public async create(dto: SendReportDto) {
        const doc = new ReportModel();

        doc.senderId = dto.sender.id;
        doc.reason = dto.reason;
        doc.targetId = dto.target.id;

        await doc.save();

        return doc;
    }
}
