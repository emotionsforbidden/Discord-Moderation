import { injectable } from 'tsyringe';
import { PunishmentType } from '@src/libs/moderation/enums/PunishmentType';

@injectable()
export class TextFormattersService {
    public humanizePunishmentType(type: PunishmentType) {
        switch (type) {
            case PunishmentType.WARN:
                return 'Warning';
            case PunishmentType.MUTE:
                return 'Mute';
            case PunishmentType.BAN:
                return 'Ban';
            default:
                return 'Unknown type';
        }
    }
}
