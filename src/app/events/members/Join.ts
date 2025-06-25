import { ArgsOf, Discord, Guard, On } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ConfigsStorage } from '@config';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { Events } from 'discord.js';
import { NotBot } from '@discordx/utilities';

@Discord()
@injectable()
@Guard(NotBot)
export class GuildMemberJoinEvent {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    @On({
        event: Events.GuildMemberAdd
    })
    public async onMemberJoin([member]: ArgsOf<Events.GuildMemberAdd>) {
        if (!member || !member.guild) return;

        const doc = await this.usersDatabase.get(member.id, member.guild.id);

        if (doc.muteInfo) {
            try {
                await member.roles.add(this.configs.discord.roles.mute);
            } catch (error) {
                this.logger.handleError(
                    error,
                    `Cannot give mute role to member with ID ${member.id}`
                );
            }
        }

        if (doc.banInfo) {
            try {
                await member.roles.add(this.configs.discord.roles.ban);
            } catch (error) {
                this.logger.handleError(
                    error,
                    `Cannot give ban role to member with ID ${member.id}`
                );
            }
        } else {
            try {
                await member.roles.add(this.configs.discord.roles.member);
            } catch (error) {
                this.logger.handleError(
                    error,
                    `Cannot give member role to member with ID ${member.id}`
                );
            }
        }
    }
}
