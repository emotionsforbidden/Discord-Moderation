import { ArgsOf, Discord, On } from 'discordx';
import { inject, singleton } from 'tsyringe';
import { ConfigsStorage } from '@config';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { Events } from 'discord.js';
import { UsersService } from '@src/libs/users/Users.service';

@Discord()
@singleton()
export class GuildMemberJoinEvent {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(UsersService) private readonly users: UsersService
    ) {}

    @On({
        event: Events.GuildMemberAdd
    })
    public async onMemberJoin([member]: ArgsOf<Events.GuildMemberAdd>) {
        if (!member || !member.guild) {
            return;
        }

        const doc = await this.usersDatabase.get(member.id, member.guild.id, {
            activePunishments: true
        });

        if (doc.activePunishments.textMute.status) {
            await this.users.addRoles(member, [
                this.configs.discord.roles.textMute
            ]);
        }

        if (doc.activePunishments.voiceMute.status) {
            await this.users.addRoles(member, [
                this.configs.discord.roles.voiceMute
            ]);
        }

        if (doc.activePunishments.ban.status) {
            await this.users.addRoles(member, [this.configs.discord.roles.ban]);
        } else {
            await this.users.addRoles(member, [
                this.configs.discord.roles.member
            ]);
        }
    }
}
