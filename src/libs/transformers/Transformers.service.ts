import { singleton } from 'tsyringe';
import { bold } from 'discord.js';
import { PunishmentType } from '@src/libs/moderation/enums/PunishmentType';

@singleton()
export class TransformersService {
    public humanizeBoolean(value: boolean) {
        return value ? bold(`Yes`) : bold(`No`);
    }

    public toSeconds(ms: number) {
        return Math.trunc(ms / 1000);
    }

    public humanizePunishmentType(type: PunishmentType) {
        switch (type) {
            case PunishmentType.BAN:
                return `Ban`;
            case PunishmentType.WARN:
                return `Warning`;
            case PunishmentType.TEXT_MUTE:
                return `Text mute`;
            case PunishmentType.VOICE_MUTE:
                return `Voice mute`;
            default:
                return `Unknown type`;
        }
    }
}
