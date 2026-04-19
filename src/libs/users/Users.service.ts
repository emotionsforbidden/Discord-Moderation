import { inject, singleton } from 'tsyringe';
import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { AvatarOrBannerType } from '@src/libs/users/enums/AvatarOrBannerType';
import { ConfigsStorage } from '@config';
import { CustomLogger } from '@src/libs/common/logger/CustomLogger';

@singleton()
export class UsersService {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    public async getUserBanner(member: GuildMember, type: AvatarOrBannerType) {
        const response = await fetch(
            type === AvatarOrBannerType.SERVER
                ? `https://discord.com/api/guilds/${member.guild.id}/members/${member.id}`
                : `https://discord.com/api/users/${member.id}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bot ${process.env.BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const { banner } = await response.json();

        return banner
            ? type === AvatarOrBannerType.SERVER
                ? banner.startsWith('a_')
                    ? `https://cdn.discordapp.com/guilds/${member.guild.id}/users/${member.id}/banners/${banner}.gif?size=4096`
                    : `https://cdn.discordapp.com/guilds/${member.guild.id}/users/${member.id}/banners/${banner}.png?size=4096`
                : banner.startsWith('a_')
                  ? `https://cdn.discordapp.com/banners/${member.id}/${banner}.gif?size=4096`
                  : `https://cdn.discordapp.com/banners/${member.id}/${banner}.png?size=4096`
            : null;
    }

    public isStaff(member: GuildMember) {
        return (
            member.roles.cache.hasAny(...this.configs.discord.roles.staff) ||
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
    }

    public checkForDevice(member: GuildMember) {
        if (!member.presence?.clientStatus) {
            return 'Unknown device';
        }

        switch (true) {
            case !!member.presence.clientStatus.desktop:
                return `PC`;
            case !!member.presence.clientStatus.mobile:
                return `Phone`;
            case !!member.presence.clientStatus.web:
                return `Browser`;
            default:
                return 'Unknown device';
        }
    }

    public async setRoles(member: GuildMember, roles: (string | null)[]) {
        const legitRoles = roles.filter((id): id is string => !!id);
        const uniqueRoles = [...new Set(legitRoles)];

        try {
            await member.roles.set(uniqueRoles);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot set roles with ID ${uniqueRoles.join(`, `)} to member with ID ${member.id}`
            );
        }
    }

    public async addRoles(member: GuildMember, roles: (string | null)[]) {
        const legitRoles = roles.filter((id): id is string => !!id);
        const uniqueRoles = [...new Set(legitRoles)];

        try {
            await member.roles.add(
                uniqueRoles.length > 1 ? uniqueRoles : uniqueRoles[0]
            );
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot add roles with ID ${uniqueRoles.join(`, `)} to member with ID ${member.id}`
            );
        }
    }

    public async removeRoles(member: GuildMember, roles: (string | null)[]) {
        const legitRoles = roles.filter((id): id is string => !!id);
        const uniqueRoles = [...new Set(legitRoles)];

        try {
            await member.roles.remove(
                uniqueRoles.length > 1 ? uniqueRoles : uniqueRoles[0]
            );
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot remove roles with ID ${uniqueRoles.join(`, `)} to member with ID ${member.id}`
            );
        }
    }
}
