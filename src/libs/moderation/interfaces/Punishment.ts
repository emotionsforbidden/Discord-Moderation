import { PunishmentType } from '@src/libs/moderation/enums/PunishmentType';

export interface IPunishment {
    type: PunishmentType;
    date: number;
    reason: string;
    expires?: number;
    moderator: string;
    roles?: string[];
}
