import { Discord, Guard, Slash, SlashOption } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags,
    User
} from 'discord.js';
import { UsersService } from '@src/libs/users/Users.service';
import { ModeratorGuard } from '@src/libs/common/discordjs/guards/Moderator.guard';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import { UtilsService } from '@src/libs/utils/Utils.service';

@Discord()
@injectable()
@Guard(ModeratorGuard)
export class ActionCommand {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(UsersService) private readonly users: UsersService,
        @inject(CustomLogger) private readonly logger: CustomLogger,
        @inject(UtilsService) private readonly utils: UtilsService
    ) {}

    @Slash({
        name: 'action',
        description: 'Use moderation action'
    })
    public async execute(
        @SlashOption({
            name: 'target',
            description: 'Member to interact with',
            type: ApplicationCommandOptionType.User,
            required: true
        })
        targetOption: GuildMember | User,
        ctx: ChatInputCommandInteraction<'cached'>,
        _client: CustomClient,
        guardData: { message: string }
    ) {
        await ctx.deferReply({
            flags: MessageFlags.Ephemeral
        });

        this.logger.log(LogLevel.INFO, guardData.message);

        const target = this.utils.resolveCommandMemberOption(ctx, targetOption);

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Moderation action')
                        .setDescription('Member **not found**')
                ]
            });
        }

        if (target.id === ctx.user.id) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Moderation action')
                        .setDescription('You **cannot interact** with yourself')
                ]
            });
        }

        if (target.user.bot) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Moderation action')
                        .setDescription('You **cannot interact** with bot')
                ]
            });
        }

        const doc = await this.usersDatabase.get(target.id, ctx.guildId);
        const targetIsStaff = this.users.isStaff(target);

        return await this.responses.replyWithMessage(
            ctx,
            this.responses.generateModActionPanel({
                target,
                doc,
                targetIsStaff
            })
        );
    }
}
