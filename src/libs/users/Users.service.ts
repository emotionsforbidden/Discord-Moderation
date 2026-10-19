import { inject, singleton } from 'tsyringe';
import {
    GuildMember,
    MessageCreateOptions,
    PermissionFlagsBits
} from 'discord.js';
import { AvatarOrBannerType } from '@src/libs/users/enums/AvatarOrBannerType';
import { CustomLogger } from '@src/libs/common/logger/CustomLogger';
import { ConfigsStorage } from '@config';

@singleton()
export class UsersService {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    public async getUserBanner(member: GuildMember, type: AvatarOrBannerType) {
        const response = await fetch(
            this.configs.discord.apiUrl +
                (type === AvatarOrBannerType.SERVER
                    ? `guilds/${member.guild.id}/members/${member.id}`
                    : `users/${member.id}`),
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
                ? this.configs.discord.cdnUrl +
                  `guilds/${member.guild.id}/users/${member.id}/banners/${banner}.${banner.startsWith('a_') ? `gif` : `png`}?size=4096`
                : this.configs.discord.cdnUrl +
                  `banners/${member.id}/${banner}.${banner.startsWith('a_') ? `gif` : `png`}?size=4096`
            : null;
    }

    public hasRoles(
        member: GuildMember,
        roles: (string | null)[],
        checkForAdmin: boolean = false
    ) {
        const legitRoles = roles.filter((id): id is string => !!id);
        const uniqueRoles = [...new Set(legitRoles)];

        if (checkForAdmin) {
            const isAdmin = member.permissions.has(
                PermissionFlagsBits.Administrator
            );

            if (uniqueRoles) {
                return member.roles.cache.hasAny(...uniqueRoles) || isAdmin;
            } else {
                return isAdmin;
            }
        } else {
            if (uniqueRoles.length) {
                return member.roles.cache.hasAny(...uniqueRoles);
            } else {
                return false;
            }
        }
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

    public async sendMessage(
        member: GuildMember,
        options: MessageCreateOptions
    ) {
        try {
            return await member.send(options);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot send message to member with ID ${member.id}`
            );
        }
    }
}
