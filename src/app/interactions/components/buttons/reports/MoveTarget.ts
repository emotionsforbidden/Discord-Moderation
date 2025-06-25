import { ButtonComponent, Discord, Guard } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ButtonInteraction, VoiceChannel } from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ReportInteractGuard } from '@src/libs/common/discordjs/guards/ReportInteract.guard';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { CustomClient } from '@src/libs/common/discordjs/Client';
import { ReportModel } from '@src/libs/common/database/reports/Report.model';

@Discord()
@injectable()
@Guard(ReportInteractGuard)
export class ReportMoveTargetButton {
    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    @ButtonComponent({
        id: /^moveTargetReport-/
    })
    public async execute(
        ctx: ButtonInteraction<'cached'>,
        _client: CustomClient,
        guardData: { doc: ReportModel }
    ) {
        await ctx.deferUpdate();

        const target = await this.utils.getMember(
            ctx.guild,
            guardData.doc.targetId
        );

        if (!target) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    embeds: [
                        this.responses
                            .getEmbedTemplate(ctx.member.displayAvatarURL())
                            .setTitle(`Move target`)
                            .setDescription(`Target **not found**`)
                    ]
                },
                true
            );
        }

        if (!target.voice.channel) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    embeds: [
                        this.responses
                            .getEmbedTemplate(ctx.member.displayAvatarURL())
                            .setTitle(`Move target`)
                            .setDescription(`Target **has to be** in voice`)
                    ]
                },
                true
            );
        }

        if (target.voice.channelId === ctx.channelId) {
            return await this.responses.replyWithMessage(
                ctx,
                {
                    embeds: [
                        this.responses
                            .getEmbedTemplate(ctx.member.displayAvatarURL())
                            .setTitle(`Move target`)
                            .setDescription(
                                `Target is **already in your voice**`
                            )
                    ]
                },
                true
            );
        }

        try {
            await target.voice.setChannel(ctx.channel as VoiceChannel);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot move member with ID ${target.id}`
            );
        }
    }
}
