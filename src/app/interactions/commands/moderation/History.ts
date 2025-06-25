import { Discord, Slash, SlashOption } from 'discordx';
import { inject, injectable } from 'tsyringe';
import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    GuildMember,
    User
} from 'discord.js';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ResponsesService } from '@src/libs/responses/Responses.service';

@Discord()
@injectable()
export class HistoryCommand {
    public constructor(
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService
    ) {}

    @Slash({
        name: 'history',
        description: `View member's punishments history`
    })
    public async execute(
        @SlashOption({
            name: 'member',
            description: 'Member to interact with',
            required: false,
            type: ApplicationCommandOptionType.User
        })
        memberOption: GuildMember | User,
        ctx: ChatInputCommandInteraction<'cached'>
    ) {
        await ctx.deferReply();

        const member = this.utils.resolveCommandMemberOption(
            ctx,
            memberOption,
            false
        ) as GuildMember;
        const doc = await this.usersDatabase.get(member.id, ctx.guildId);
        const page = this.utils.paginate({
            items: doc.history,
            reverse: true
        });

        return await this.responses.replyWithMessage(
            ctx,
            this.responses.generateHistoryPage({
                executor: ctx.member,
                member,
                page
            })
        );
    }
}
