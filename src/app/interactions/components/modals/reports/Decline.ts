import { Discord, Guard, ModalComponent } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ModalSubmitInteraction } from 'discord.js';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ModeratorGuard } from '@src/libs/common/discordjs/guards/Moderator.guard';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ReportsManager } from '@src/libs/common/database/reports/Reports.manager';
import { LogLevel } from '@src/libs/common/logger/enums/LogLevel';
import { UsersService } from '@src/libs/users/Users.service';
import { ReportsService } from '@src/libs/reports/Reports.service';

@Discord()
@injectable()
@Guard(ModeratorGuard)
export class ReportDeclineModal {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(CustomLogger) private readonly logger: CustomLogger,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ReportsManager)
        private readonly reportsDatabase: ReportsManager,
        @inject(UsersService) private readonly users: UsersService,
        @inject(ReportsService) private readonly reports: ReportsService
    ) {}

    @ModalComponent({
        id: /^declineReport-/
    })
    public async execute(
        ctx: ModalSubmitInteraction<'cached'>,
        _client: CustomClient,
        guardData: { message: string }
    ) {
        await ctx.deferUpdate();

        this.logger.log(LogLevel.INFO, guardData.message);

        const reason = ctx.fields.getTextInputValue('reason');
        const docId = Number(this.utils.getParamsFromId(ctx.customId)[1]);
        const doc = await this.reportsDatabase.getById(docId);

        if (!doc) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    embeds: [
                        this.responses
                            .getEmbedTemplate(ctx.member.displayAvatarURL())
                            .setTitle(`Decline report`)
                            .setDescription(`Report **not found**`)
                    ]
                },
                true
            );
        }

        const sender = await this.utils.getMember(ctx.guild, doc.senderId);

        if (sender) {
            if (sender.id === ctx.user.id) {
                return await this.responses.replyWithMessage(
                    ctx,
                    {
                        embeds: [
                            this.responses
                                .getEmbedTemplate(ctx.member.displayAvatarURL())
                                .setTitle(`Decline report`)
                                .setDescription(
                                    `You **cannot interact** with your report`
                                )
                        ]
                    },
                    true
                );
            }

            const senderIsStaff = this.users.isStaff(sender);

            if (senderIsStaff) {
                const executorIsHighStaff = this.users.isHighStaff(ctx.member);

                if (!executorIsHighStaff) {
                    return await this.responses.replyWithMessage(
                        ctx,
                        {
                            embeds: [
                                this.responses
                                    .getEmbedTemplate(
                                        ctx.member.displayAvatarURL()
                                    )
                                    .setTitle(`Accept report`)
                                    .setDescription(
                                        `You **cannot interact** with this report`
                                    )
                            ]
                        },
                        true
                    );
                }
            }
        }

        return await this.reports.decline({
            ctx,
            executor: ctx.member,
            sender,
            doc,
            reason
        });
    }
}
