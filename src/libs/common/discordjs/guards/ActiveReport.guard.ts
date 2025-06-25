import { GuardFunction } from 'discordx';
import { ModalSubmitInteraction } from 'discord.js';
import { container } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ReportsManager } from '@src/libs/common/database/reports/Reports.manager';

const reportsDatabase = container.resolve(ReportsManager);
const responses = container.resolve(ResponsesService);
export const ActiveReportGuard: GuardFunction<
    ModalSubmitInteraction<'cached'>
> = async (ctx, _client, next) => {
    const doc = await reportsDatabase.getActiveReportBySender(ctx.user.id);

    if (!doc) {
        return await next();
    }

    return await responses.replyWithMessage(ctx, {
        embeds: [
            responses
                .getEmbedTemplate(ctx.member.displayAvatarURL())
                .setTitle('Send report')
                .setDescription(
                    `You **already have** an active [report](https://discord.com/channels/${ctx.guildId}/${doc.channelId})`
                )
        ]
    });
};
