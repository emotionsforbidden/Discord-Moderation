import { GuardFunction } from 'discordx';
import { container } from 'tsyringe';
import {
    bold,
    ContainerBuilder,
    MessageComponentInteraction,
    MessageFlags
} from 'discord.js';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ReportsManager } from '@src/libs/common/database/reports/Reports.manager';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { DiscordConfig as config } from '@src/configs/Discord';
import { UsersService } from '@src/libs/users/Users.service';

const responses = container.resolve(ResponsesService);
const utils = container.resolve(UtilsService);
const reportsDatabase = container.resolve(ReportsManager);
const users = container.resolve(UsersService);

export const ReportResponsibleGuard: GuardFunction<
    MessageComponentInteraction<'cached'>
> = async (ctx, _client, next, data) => {
    const docId = Number(utils.getParamsFromId(ctx.customId)[1]);
    const doc = await reportsDatabase.get(docId);
    const builder = new ContainerBuilder();

    if (!doc) {
        return await responses.replyWithMessage(ctx, {
            components: [
                responses.modifyContainer(
                    builder,
                    ctx.user.displayAvatarURL({ forceStatic: true }),
                    [
                        `## Report interaction`,
                        `${ctx.user}, Report ${bold(`not found`)}`
                    ]
                )
            ],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
        });
    }

    if (
        doc.moderatorId === ctx.user.id ||
        users.hasRoles(ctx.member, config.roles.reports.high, true)
    ) {
        data.doc = doc;
        data.builder = builder;

        return await next();
    }

    await responses.replyWithMessage(ctx, {
        components: [
            responses.modifyContainer(
                builder,
                ctx.user.displayAvatarURL({ forceStatic: true }),
                [
                    `## Report interaction`,
                    `${ctx.user}, You ${bold(`cannot interact`)} with this report`
                ]
            )
        ],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2]
    });
};
