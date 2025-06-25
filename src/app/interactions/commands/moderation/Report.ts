import { Discord, Slash, SlashOption } from 'discordx';
import { inject, injectable } from 'tsyringe';
import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    GuildMember,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    User
} from 'discord.js';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UtilsService } from '@src/libs/utils/Utils.service';

@Discord()
@injectable()
export class ReportCommand {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UtilsService) private readonly utils: UtilsService
    ) {}

    @Slash({
        name: 'report',
        description: 'Send report'
    })
    public async execute(
        @SlashOption({
            name: 'target',
            description: 'Member to interact with',
            required: true,
            type: ApplicationCommandOptionType.User
        })
        targetOption: GuildMember | User,
        ctx: ChatInputCommandInteraction<'cached'>
    ) {
        const target = this.utils.resolveCommandMemberOption(ctx, targetOption);

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Send report')
                        .setDescription('Member **not found**')
                ]
            });
        }

        return await ctx.showModal(
            new ModalBuilder()
                .setTitle('Send report')
                .setCustomId(`sendReport-${target.id}`)
                .setComponents(
                    this.responses.getModalRowTemplate([
                        new TextInputBuilder()
                            .setLabel('Reason')
                            .setMaxLength(150)
                            .setStyle(TextInputStyle.Paragraph)
                            .setCustomId('reason')
                    ])
                )
        );
    }
}
