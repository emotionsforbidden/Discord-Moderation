import { Discord, Guard, ModalComponent } from 'discordx';
import { ModalSubmitInteraction } from 'discord.js';
import { inject, injectable } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import ms from 'ms';
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
export class BanModal {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(ModerationService)
        private readonly moderation: ModerationService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    @ModalComponent({ id: /^banUser-/ })
    public async execute(
        ctx: ModalSubmitInteraction<'cached'>,
        _client: CustomClient,
        guardData: { message: string }
    ) {
        await ctx.deferUpdate();

        this.logger.log(LogLevel.INFO, guardData.message);

        const targetId = this.utils.getParamsFromId(ctx.customId)[1];
        const reason = ctx.fields.getTextInputValue('reason');
        const duration = ms(ctx.fields.getTextInputValue('duration'));

        const target = await this.utils.getMember(ctx.guild, targetId);

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Ban member')
                        .setDescription('Member **not found**')
                ],
                components: []
            });
        }

        const targetIsStaff = this.users.isStaff(target);

        if (targetIsStaff) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Ban member')
                        .setDescription('You **cannot interact** with staff')
                ],
                components: []
            });
        }

        if (Math.floor(duration) / 1000 <= 0 || !duration) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Ban member')
                        .setDescription(
                            'Choose duration **between 1 and 30 days**'
                        )
                ],
                components: []
            });
        }

        if (duration < ms('1d') || duration > ms('30d')) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Ban member')
                        .setDescription(
                            'Choose duration **between 1 and 30 days**'
                        )
                ],
                components: []
            });
        }

        const doc = await this.usersDatabase.get(target.id, ctx.guildId);

        if (doc.banInfo) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Ban member')
                        .setDescription('Member is **already banned**')
                ],
                components: []
            });
        }

        await this.moderation.ban({
            target,
            executor: ctx.member,
            reason,
            duration,
            doc
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
