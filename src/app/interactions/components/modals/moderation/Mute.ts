import { Discord, ModalComponent } from 'discordx';
import { ModalSubmitInteraction } from 'discord.js';
import { inject, injectable } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import ms from 'ms';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { ModerationService } from '@src/libs/moderation/Moderation.service';
import { UsersService } from '@src/libs/users/Users.service';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';

@Discord()
@injectable()
export class MuteModal {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(ModerationService)
        private readonly moderation: ModerationService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    @ModalComponent({ id: /^muteUser-/ })
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
                        .setTitle('Mute member')
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
                        .setTitle('Mute member')
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
                        .setTitle('Mute member')
                        .setDescription(
                            'Choose duration **from 1 minute to 5 hours**'
                        )
                ],
                components: []
            });
        }

        if (duration < ms('1m') || duration > ms('5h')) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Mute member')
                        .setDescription(
                            'Choose duration **from 1 minute to 5 hours**'
                        )
                ],
                components: []
            });
        }

        const doc = await this.usersDatabase.get(target.id, ctx.guildId);

        if (doc.muteInfo) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Mute member')
                        .setDescription('Member is **already muted**')
                ],
                components: []
            });
        }

        await this.moderation.mute({
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
