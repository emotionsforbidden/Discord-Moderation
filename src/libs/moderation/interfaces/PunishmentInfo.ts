import { PunishmentType } from '@src/libs/moderation/enums/PunishmentType';

export interface IPunishmentInfo {
    type: PunishmentType;
    reason: string;
    moderatorId: string;
    executedAt: number;
    expiresAt: number;
}
