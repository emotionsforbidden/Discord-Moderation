import { inject, singleton } from 'tsyringe';
import { ExecutePunishmentDto } from '@src/libs/moderation/dto/ExecutePunishmentDto';
import { PunishmentType } from '@src/libs/moderation/enums/PunishmentType';
import { ConfigsStorage as configs, ConfigsStorage } from '@config';
import { DateService } from '@src/libs/common/date/Date.service';
import { ClientUser, Guild, GuildMember } from 'discord.js';
import { UsersService } from '@src/libs/users/Users.service';
import CronTime from 'cron-time-generator';
import { CronJob } from 'cron';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import ms from 'ms';

@singleton()
export class ModerationService {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(DateService) private readonly date: DateService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager
    ) {}

    public async executeBan(dto: ExecutePunishmentDto) {
        const banIgnores = new Set(this.configs.discord.roles.banIgnore);

        const rolesToRestore = [
            ...dto.target.roles.cache
                .filter((role) => !role.managed || !banIgnores.has(role.id))
                .keys()
        ];
        const rolesToSet = [
            ...dto.target.roles.cache
                .filter((role) => role.managed || banIgnores.has(role.id))
                .keys()
        ];

        if (this.configs.discord.roles.ban) {
            rolesToSet.push(this.configs.discord.roles.ban);
        }

        dto.doc.activePunishments.ban = {
            status: true,
            expiresAt: dto.endsAt,
            rolesToRestore
        };
        dto.doc.activePunishments.warns = 0;
        dto.doc.punishments.push({
            executedAt: this.date.nowTimestamp(),
            type: PunishmentType.BAN,
            moderatorId: dto.executor.id,
            reason: dto.reason,
            expiresAt: dto.endsAt
        });

        await Promise.all([
            dto.doc.save(),
            this.users.setRoles(dto.target, rolesToSet)
        ]);
    }

    public async executeTextMute(dto: ExecutePunishmentDto) {
        dto.doc.activePunishments.textMute = {
            status: true,
            expiresAt: dto.endsAt
        };
        dto.doc.punishments.push({
            executedAt: this.date.nowTimestamp(),
            type: PunishmentType.TEXT_MUTE,
            moderatorId: dto.executor.id,
            reason: dto.reason,
            expiresAt: dto.endsAt
        });

        await Promise.all([
            dto.doc.save(),
            this.users.addRoles(dto.target, [
                this.configs.discord.roles.textMute
            ])
        ]);
    }

    public async executeVoiceMute(dto: ExecutePunishmentDto) {
        dto.doc.activePunishments.voiceMute = {
            status: true,
            expiresAt: dto.endsAt
        };
        dto.doc.punishments.push({
            executedAt: this.date.nowTimestamp(),
            type: PunishmentType.VOICE_MUTE,
            moderatorId: dto.executor.id,
            reason: dto.reason,
            expiresAt: dto.endsAt
        });

        await Promise.all([
            dto.doc.save(),
            this.users.addRoles(dto.target, [
                this.configs.discord.roles.voiceMute
            ])
        ]);
    }

    public async executeWarn(dto: ExecutePunishmentDto) {
        dto.doc.activePunishments.warns++;
        dto.doc.punishments.push({
            executedAt: this.date.nowTimestamp(),
            type: PunishmentType.WARN,
            moderatorId: dto.executor.id,
            reason: dto.reason,
            expiresAt: dto.endsAt
        });

        if (dto.doc.activePunishments.warns >= 3) {
            await this.executeBan({
                ...dto,
                reason: `3 warnings`,
                endsAt: this.date.nowTimestamp() + ms('30d')
            });
        } else {
            await dto.doc.save();
        }
    }

    public canInteract(member: GuildMember) {
        return this.users.hasRoles(
            member,
            configs.discord.roles.canInteract,
            true
        );
    }

    public autoRemoveExpired(guild: Guild) {
        CronJob.from({
            cronTime: CronTime.every(2).minutes(),
            start: true,
            waitForCompletion: true,
            onTick: async () => {
                const [
                    expiredTextMutesDocs,
                    expiredVoiceMutesDocs,
                    expiredBansDocs
                ] = await Promise.all([
                    this.usersDatabase.getExpiredTextMutes(),
                    this.usersDatabase.getExpiredVoiceMutes(),
                    this.usersDatabase.getExpiredBans()
                ]);

                for (const textMuteDoc of expiredTextMutesDocs) {
                    const target = await this.utils.getMember(
                        guild,
                        textMuteDoc.userId
                    );

                    if (!target) {
                        continue;
                    }

                    await this.removeTextMute({
                        target,
                        doc: textMuteDoc,
                        executor: guild.client.user,
                        reason: `Punishment expired`
                    });
                }

                for (const voiceMuteDoc of expiredVoiceMutesDocs) {
                    const target = await this.utils.getMember(
                        guild,
                        voiceMuteDoc.userId
                    );

                    if (!target) {
                        continue;
                    }

                    await this.removeVoiceMute({
                        target,
                        doc: voiceMuteDoc,
                        executor: guild.client.user,
                        reason: `Punishment expired`
                    });
                }

                for (const banDoc of expiredBansDocs) {
                    const target = await this.utils.getMember(
                        guild,
                        banDoc.userId
                    );

                    if (!target) {
                        continue;
                    }

                    await this.removeBan({
                        target,
                        doc: banDoc,
                        executor: guild.client.user,
                        reason: `Punishment expired`
                    });
                }
            }
        });
    }

    public async removeTextMute(
        dto: Omit<ExecutePunishmentDto, 'endsAt' | 'type' | 'executor'> & {
            executor: GuildMember | ClientUser;
        }
    ) {
        dto.doc.activePunishments.textMute = {
            status: false,
            expiresAt: 0
        };

        await Promise.all([
            dto.doc.save(),
            this.users.removeRoles(dto.target, [
                this.configs.discord.roles.textMute
            ])
        ]);
    }

    public async removeVoiceMute(
        dto: Omit<ExecutePunishmentDto, 'endsAt' | 'type' | 'executor'> & {
            executor: GuildMember | ClientUser;
        }
    ) {
        dto.doc.activePunishments.voiceMute = {
            status: false,
            expiresAt: 0
        };

        await Promise.all([
            dto.doc.save(),
            this.users.removeRoles(dto.target, [
                this.configs.discord.roles.voiceMute
            ])
        ]);
    }

    public async removeBan(
        dto: Omit<ExecutePunishmentDto, 'endsAt' | 'type' | 'executor'> & {
            executor: GuildMember | ClientUser;
        }
    ) {
        const ignoredRoles = new Set([
            ...this.configs.discord.roles.banIgnore,
            this.configs.discord.roles.ban
        ]);
        const rolesToSet = dto.doc.activePunishments.ban.rolesToRestore.filter(
            (id) => !ignoredRoles.has(id)
        );

        dto.doc.activePunishments.ban.status = false;

        await Promise.all([
            dto.doc.save(),
            this.users.setRoles(
                dto.target,
                rolesToSet.concat([
                    ...dto.target.roles.cache
                        .filter((role) => role.managed)
                        .keys()
                ])
            )
        ]);
    }

    public async removeWarn(
        dto: Omit<ExecutePunishmentDto, 'endsAt' | 'type'>
    ) {
        dto.doc.activePunishments.warns--;
        await dto.doc.save();
    }
}
