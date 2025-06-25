import { GuardFunction } from 'discordx';
import {
    ButtonInteraction,
    PermissionFlagsBits,
    UserSelectMenuInteraction
} from 'discord.js';
import { container } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ReportsManager } from '@src/libs/common/database/reports/Reports.manager';
import { UtilsService } from '@src/libs/utils/Utils.service';

const utils = container.resolve(UtilsService);
const reportsDatabase = container.resolve(ReportsManager);
const responses = container.resolve(ResponsesService);
export const ReportInteractGuard: GuardFunction<
    ButtonInteraction<'cached'> | UserSelectMenuInteraction<'cached'>
> = async (ctx, _client, next, data) => {
    const docId = Number(utils.getParamsFromId(ctx.customId)[1]);
    const doc = await reportsDatabase.getById(docId);

    if (!doc) {
        return await responses.replyWithMessage(ctx, {
            embeds: [
                responses
                    .getEmbedTemplate(ctx.member.displayAvatarURL())
                    .setTitle(`Report interact`)
                    .setDescription(`Report **not found**`)
            ]
        });
    }

    if (
        doc.responsibleId === ctx.user.id ||
        ctx.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
        data.doc = doc;
        return await next();
    }

    return await responses.replyWithMessage(ctx, {
        embeds: [
            responses
                .getEmbedTemplate(ctx.member.displayAvatarURL())
                .setTitle(`Report interact`)
                .setDescription(`You **cannot interact** with this report`)
        ]
    });
};
