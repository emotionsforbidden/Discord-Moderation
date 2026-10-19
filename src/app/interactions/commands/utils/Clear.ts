import { Discord, Slash, SlashOption } from 'discordx';
import { inject, singleton } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import {
    ApplicationCommandOptionType,
    bold,
    ChatInputCommandInteraction,
    ContainerBuilder,
    GuildMember,
    MessageFlags,
    User
} from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';

@Discord()
@singleton()
export class ClearCommand {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UtilsService) private readonly utils: UtilsService
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
        const builder = new ContainerBuilder();

        if (!channel) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Messages delete`,
                            `${ctx.user}, Channel ${bold(`not found`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const messages = await this.utils.getMessages(channel);

        if (!messages) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Messages delete`,
                            `${ctx.user}, Messages ${bold(`not found`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
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
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Messages delete`,
                            `${ctx.user}, Messages ${bold(`not found`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        await Promise.all([
            channel.bulkDelete(filteredMessages.first(deleteCount), true),
            this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Messages delete`,
                            `${ctx.user}, ${bold(`Successfully deleted`)} messages from ${channel}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            })
        ]);
    }
}
