import { Discord, ModalComponent } from 'discordx';
import { ModalSubmitInteraction } from 'discord.js';
import { inject, injectable } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { ModerationService } from '@src/libs/moderation/Moderation.service';
import { UsersService } from '@src/libs/users/Users.service';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';

@Discord()
@injectable()
export class WarnModal {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(ModerationService)
        private readonly moderation: ModerationService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    @ModalComponent({ id: /^warnUser-/ })
    public async execute(
        ctx: ModalSubmitInteraction<'cached'>,
        _client: CustomClient,
        guardData: { message: string }
    ) {
        await ctx.deferUpdate();

        this.logger.log(LogLevel.INFO, guardData.message);

        const targetId = this.utils.getParamsFromId(ctx.customId)[1];
        const reason = ctx.fields.getTextInputValue('reason');
        const target = await this.utils.getMember(ctx.guild, targetId);

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Warn member')
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
                        .setTitle('Warn member')
                        .setDescription('You **cannot interact** with staff')
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
                        .setTitle('Warn member')
                        .setDescription('Member is **already banned**')
                ],
                components: []
            });
        }

        await this.moderation.warn({
            target,
            executor: ctx.member,
            reason,
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
