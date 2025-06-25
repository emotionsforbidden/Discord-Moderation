import { GuardFunction } from 'discordx';
import type { AnyInteraction } from '@src/libs/common/discordjs/types/AnyInteraction';
import { MessageFlags } from 'discord.js';
import { container } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ModerationService } from '@src/libs/moderation/Moderation.service';

const moderation = container.resolve(ModerationService);
const responses = container.resolve(ResponsesService);
export const ModeratorGuard: GuardFunction<AnyInteraction> = async (
    ctx,
    _client,
    next,
    data
) => {
    const canInteract = moderation.canInteract(ctx.member);

    if (canInteract) {
        data.message = `Member with ID ${ctx.user.id} passed moderation guard`;
        return await next();
    }

    return await responses.replyWithMessage(ctx, {
        embeds: [
            responses
                .getEmbedTemplate(ctx.member.displayAvatarURL())
                .setTitle(`Cannot interact`)
                .setDescription(`You **don't have access** to this module`)
        ],
        flags: MessageFlags.Ephemeral
    });
};
