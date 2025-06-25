import { ButtonComponent, Discord, Guard } from 'discordx';
import { ButtonInteraction } from 'discord.js';
import { inject, injectable } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { ModerationService } from '@src/libs/moderation/Moderation.service';
import { UsersService } from '@src/libs/users/Users.service';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ModeratorGuard } from '@src/libs/common/discordjs/guards/Moderator.guard';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';

@Discord()
@injectable()
@Guard(ModeratorGuard)
export class UnbanButton {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(ModerationService)
        private readonly moderation: ModerationService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    @ButtonComponent({ id: /^unbanUser-/ })
    public async execute(
        ctx: ButtonInteraction<'cached'>,
        _client: CustomClient,
        guardData: { message: string }
    ) {
        await ctx.deferUpdate();

        this.logger.log(LogLevel.INFO, guardData.message);

        const targetId = this.utils.getParamsFromId(ctx.customId)[1];
        const target = await this.utils.getMember(ctx.guild, targetId);

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Unban member')
                        .setDescription('Member **not found**')
                ],
                components: []
            });
        }

        const targetIsStaff = this.users.isStaff(target);
        const doc = await this.usersDatabase.get(target.id, ctx.guildId);

        if (!doc.banInfo) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Unban member')
                        .setDescription(`Member **isn't banned** yet`)
                ],
                components: []
            });
        }

        await this.moderation.unban({
            target,
            doc,
            executor: ctx.member
        });

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
