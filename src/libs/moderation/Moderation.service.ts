import { inject, injectable } from 'tsyringe';
import { PunishmentDto } from '@src/libs/moderation/dto/PunishmentDto';
import { PunishmentType } from '@src/libs/moderation/enums/PunishmentType';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { ConfigsStorage as configs, ConfigsStorage } from '@config';
import ms from 'ms';
import { DateService } from '@src/libs/date/Date.service';
import { RemovePunishmentDto } from '@src/libs/moderation/dto/RemovePunishmentDto';
import { Guild, GuildMember, PermissionFlagsBits } from 'discord.js';
import { CronJob } from 'cron';
import { CronTime } from 'cron-time-generator';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { LogsService } from '@src/libs/logs/Logs.service';

@injectable()
export class ModerationService {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(CustomLogger) private readonly logger: CustomLogger,
        @inject(DateService) private readonly date: DateService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(LogsService) private readonly logs: LogsService
    ) {}

    public async mute(dto: PunishmentDto) {
        const expires = this.date.nowTimestamp() + dto.duration!;

        dto.doc.muteInfo = {
            type: PunishmentType.MUTE,
            moderator: dto.executor.id,
            date: this.date.nowTimestamp(),
            expires,
            reason: dto.reason
        };
        dto.doc.history.push({
            type: PunishmentType.MUTE,
            moderator: dto.executor.id,
            date: this.date.nowTimestamp(),
            expires,
            reason: dto.reason
        });
        await dto.doc.save();

        try {
            await dto.target.roles.add(this.configs.discord.roles.mute);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot give mute role to member with ID ${dto.target.id}`
            );
        }

        await this.logs.punishmentLog(dto, PunishmentType.MUTE);
    }

    public async ban(dto: PunishmentDto) {
        const expires = this.date.nowTimestamp() + dto.duration!;
        const rolesForRestore = dto.target.roles.cache.filter(
            (role) =>
                !role.managed &&
                this.configs.discord.roles.banIgnore.includes(role.id)
        );

        dto.doc.warnsInfo = 0;
        dto.doc.banInfo = {
            type: PunishmentType.BAN,
            moderator: dto.executor.id,
            date: this.date.nowTimestamp(),
            expires,
            reason: dto.reason,
            roles: rolesForRestore.map((role) => role.id)
        };
        dto.doc.history.push({
            type: PunishmentType.BAN,
            moderator: dto.executor.id,
            date: this.date.nowTimestamp(),
            expires,
            reason: dto.reason
        });
        await dto.doc.save();

        try {
            await dto.target.roles.remove(rolesForRestore);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot remove roles from member with ID ${dto.target.id}`
            );
        }

        try {
            await dto.target.roles.add(this.configs.discord.roles.ban);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot give ban role to member with ID ${dto.target.id}`
            );
        }

        await this.logs.punishmentLog(dto, PunishmentType.BAN);
    }

    public async warn(dto: PunishmentDto) {
        dto.doc.warnsInfo++;
        dto.doc.history.push({
            type: PunishmentType.WARN,
            reason: dto.reason,
            moderator: dto.executor.id,
            date: this.date.nowTimestamp()
        });

        if (dto.doc.warnsInfo >= 3) {
            await this.ban({
                ...dto,
                duration: ms('30d'),
                reason: '3 warns'
            });
        }
        await dto.doc.save();

        await this.logs.punishmentLog(dto, PunishmentType.WARN);
    }

    public async unmute(dto: RemovePunishmentDto) {
        dto.doc.muteInfo = null;
        await dto.doc.save();

        if (dto.target) {
            try {
                await dto.target.roles.remove(this.configs.discord.roles.mute);
            } catch (error) {
                this.logger.handleError(
                    error,
                    `Cannot remove mute role from member with ID ${dto.target.id}`
                );
            }
        }

        await this.logs.removePunishmentLog(dto, PunishmentType.MUTE);
    }

    public async unban(dto: RemovePunishmentDto) {
        const roles = dto.doc.banInfo?.roles;

        dto.doc.banInfo = null;
        await dto.doc.save();

        if (dto.target) {
            try {
                await dto.target.roles.remove(this.configs.discord.roles.ban);
            } catch (error) {
                this.logger.handleError(
                    error,
                    `Cannot remove mute role from member with ID ${dto.target.id}`
                );
            }

            if (roles) {
                await this.restoreRoles(
                    dto.target,
                    roles.filter(
                        (id) =>
                            !this.configs.discord.roles.banIgnore.includes(id)
                    )
                );
            }
        }

        await this.logs.removePunishmentLog(dto, PunishmentType.BAN);
    }

    public async unwarn(dto: RemovePunishmentDto) {
        dto.doc.warnsInfo--;
        await dto.doc.save();

        await this.logs.removePunishmentLog(dto, PunishmentType.WARN);
    }

    private async restoreRoles(member: GuildMember, roles: string[]) {
        const finalList: string[] = [];

        for (const roleId of roles) {
            const role = await this.utils.getRole(member.guild, roleId);

            if (!role || role.managed) {
                continue;
            }

            finalList.push(roleId);
        }

        try {
            await member.roles.add(finalList);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot restore roles to member with ID ${member.id}`
            );
        }
    }

    public autoRemoveExpired(guild?: Guild) {
        if (!guild) return;

        CronJob.from({
            cronTime: CronTime.every(2).minutes(),
            start: true,
            onTick: async () => {
                const expiredMutesDocs =
                    await this.usersDatabase.getExpiredMutes();
                const expiredBansDocs =
                    await this.usersDatabase.getExpiredBans();
                const bot = await guild.members.fetchMe();

                for (const muteDoc of expiredMutesDocs) {
                    const memberMuted = await this.utils.getMember(
                        guild,
                        muteDoc.userId
                    );

                    await this.unmute({
                        target: memberMuted,
                        doc: muteDoc,
                        executor: bot
                    });
                }

                for (const banDoc of expiredBansDocs) {
                    const memberBanned = await this.utils.getMember(
                        guild,
                        banDoc.userId
                    );

                    await this.unban({
                        target: memberBanned,
                        doc: banDoc,
                        executor: bot
                    });
                }
            }
        });
    }

    public canInteract(member: GuildMember) {
        return (
            member.roles.cache.hasAny(...configs.discord.roles.canInteract) ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
    }
}
