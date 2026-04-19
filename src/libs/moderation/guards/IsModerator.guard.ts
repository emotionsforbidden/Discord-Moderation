import { GuardFunction } from 'discordx';
import type { AnyInteraction } from '@src/libs/common/discordjs/types/AnyInteraction';
import { bold, ContainerBuilder, MessageFlags } from 'discord.js';
import { container } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ModerationService } from '@src/libs/moderation/Moderation.service';

const moderation = container.resolve(ModerationService);
const responses = container.resolve(ResponsesService);
export const IsModeratorGuard: GuardFunction<AnyInteraction> = async (
    ctx,
    _client,
    next,
    data
) => {
    const canInteract = moderation.canInteract(ctx.member);
    const builder = new ContainerBuilder();

    if (canInteract) {
        data.builder = builder;
        return await next();
    }

    return await responses.replyWithMessage(ctx, {
        components: [
            responses.modifyContainer(builder, ctx.user.displayAvatarURL(), [
                `## Access denied`,
                `${ctx.user}, You ${bold(`cannot interact`)} with this module`
            ])
        ],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
    });
};
