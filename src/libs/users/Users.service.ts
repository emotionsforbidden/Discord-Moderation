import { injectable } from 'tsyringe';
import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { AvatarOrBannerType } from '@src/libs/users/enums/AvatarOrBannerType';
import { ConfigsStorage } from '@config';

@injectable()
export class UsersService {
    private readonly configs = ConfigsStorage;

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

    public isHighStaff(member: GuildMember) {
        return (
            member.roles.cache.hasAny(
                ...this.configs.discord.roles.highStaff
            ) || member.permissions.has(PermissionFlagsBits.Administrator)
        );
    }
}
