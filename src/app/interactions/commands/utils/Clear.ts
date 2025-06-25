import { Discord, Slash, SlashOption } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags,
    User
} from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { CustomLogger } from '@src/libs/common/logger/Logger';

@Discord()
@injectable()
export class ClearCommand {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    @Slash({
        name: 'clear',
        description: 'Delete messages from the channel'
    })
    public async execute(
        @SlashOption({
            name: 'amount',
            description: 'Amount of messages to delete',
            type: ApplicationCommandOptionType.Number,
            required: true,
            minValue: 1,
            maxValue: 100
        })
        amount: number,

        @SlashOption({
            description: 'Messages author',
            name: 'author',
            required: false,
            type: ApplicationCommandOptionType.User
        })
        author: GuildMember | User,
        ctx: ChatInputCommandInteraction<'cached'>
    ) {
        await ctx.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const channel = ctx.channel;

        if (!channel) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Messages delete')
                        .setDescription('Channel **not found**')
                ]
            });
        }

        const messages = await this.utils.getMessages(channel);

        if (!messages) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Messages delete')
                        .setDescription('Messages **not found**')
                ]
            });
        }

        let filteredMessages = messages;
        if (author) {
            filteredMessages = messages.filter(
                (msg) => msg.author.id === author.id
            );
        }

        const deleteCount = Math.min(amount, filteredMessages.size);

        if (deleteCount === 0) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Messages delete')
                        .setDescription('Messages **not found**')
                ]
            });
        }

        try {
            await channel.bulkDelete(filteredMessages.first(deleteCount), true);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot delete messages in channel ${channel.id}`
            );
        }

        return await this.responses.replyWithMessage(ctx, {
            embeds: [
                this.responses
                    .getEmbedTemplate(ctx.member.displayAvatarURL())
                    .setTitle('Messages delete')
                    .setDescription('**Successfully deleted** messages')
                    .setFields({
                        name: '> Information',
                        value: `・**Amount:** \`${amount}\`\n・**Author:** ${author ?? '`not provided`'}`
                    })
            ]
        });
    }
}
