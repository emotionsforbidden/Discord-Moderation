import { Discord, Slash, SlashOption } from 'discordx';
import { inject, singleton } from 'tsyringe';
import {
    ApplicationCommandOptionType,
    bold,
    ChatInputCommandInteraction,
    codeBlock,
    ComponentType,
    ContainerBuilder,
    GuildMember,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
    User,
    userMention
} from 'discord.js';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import ms from 'ms';
import { PaginatorPageAction } from '@src/libs/responses/enums/PaginatorPageAction';
import { IPunishmentInfo } from '@src/libs/moderation/interfaces/PunishmentInfo';
import { TransformersService } from '@src/libs/transformers/Transformers.service';

@Discord()
@singleton()
export class ModerationHistoryCommand {
    private renderPage(
        member: GuildMember,
        punishments: IPunishmentInfo[],
        needToDisable: {
            start: boolean;
            left: boolean;
            right: boolean;
            end: boolean;
        },
        builder: ContainerBuilder,
        page: number = 0
    ) {
        return builder
            .addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(
                        new ThumbnailBuilder().setURL(
                            member.displayAvatarURL({ forceStatic: true })
                        )
                    )
                    .addTextDisplayComponents(
                        [
                            `## Selected member:`,
                            [
                                `- ${member}`,
                                `- ${member.user.username}`,
                                `- ${member.id}`
                            ].join(`\n`)
                        ].map((value) =>
                            new TextDisplayBuilder().setContent(value)
                        )
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addTextDisplayComponents(
                [
                    `## Punishments on the page:`,
                    punishments
                        .map((punishment) =>
                            [
                                `[<t:${this.transformers.toSeconds(punishment.executedAt)}:f>]`,
                                `- Moderator: ${userMention(punishment.moderatorId)}`,
                                `- Type: ${bold(this.transformers.humanizePunishmentType(punishment.type))}`,
                                `- Expires: ${punishment.expiresAt ? `<t:${this.transformers.toSeconds(punishment.expiresAt)}:f>` : bold(`Without expiration date`)}`,
                                `- Reason: ${bold(punishment.reason)}`
                            ].join(`\n`)
                        )
                        .join(`\n\n`) || codeBlock(`Punishments list is empty`)
                ].map((value) => new TextDisplayBuilder().setContent(value))
            )
            .addSeparatorComponents(
                new SeparatorBuilder()
                    .setDivider(true)
                    .setSpacing(SeparatorSpacingSize.Large)
            )
            .addActionRowComponents((actionRow) =>
                actionRow.setComponents(
                    this.responses.paginator(
                        `PunishmentsHistory`,
                        needToDisable,
                        [page]
                    )
                )
            );
    }

    public constructor(
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(TransformersService)
        private readonly transformers: TransformersService
    ) {}

    @Slash({
        name: 'history',
        description: `View member's punishments history`
    })
    public async execute(
        @SlashOption({
            name: 'member',
            description: 'Member to interact with',
            required: false,
            type: ApplicationCommandOptionType.User
        })
        memberOption: GuildMember | User,
        ctx: ChatInputCommandInteraction<'cached'>
    ) {
        const member = this.utils.resolveCommandMemberOption(
            ctx,
            memberOption,
            false
        ) as GuildMember;
        const [interactionCallback, doc] = await Promise.all([
            ctx.deferReply({
                withResponse: true
            }),
            this.usersDatabase.get(member.id, ctx.guildId, {
                punishments: true
            })
        ]);
        const paginated = this.utils.paginate({
            items: doc.punishments,
            reverse: true
        });

        await this.responses.replyWithMessage(ctx, {
            components: [
                this.renderPage(
                    member,
                    paginated.sliced,
                    {
                        start: true,
                        left: true,
                        right: !paginated.checkForNextPage,
                        end: !paginated.checkForNextPage
                    },
                    new ContainerBuilder()
                )
            ],
            flags: MessageFlags.IsComponentsV2
        });

        if (
            paginated.checkForNextPage &&
            interactionCallback.resource?.message
        ) {
            const collector =
                interactionCallback.resource.message.createMessageComponentCollector(
                    {
                        time: ms('15m'),
                        idle: ms('3m'),
                        filter: (int) => int.user.id === ctx.user.id,
                        componentType: ComponentType.Button
                    }
                );

            collector.on('collect', async (collected) => {
                await collected.deferUpdate();

                const action: PaginatorPageAction = Number(
                    this.utils.getParamsFromId(collected.customId)[1]
                );
                let page = Number(
                    this.utils.getParamsFromId(collected.customId)[2]
                );
                page = this.utils.calculatePageNumber(
                    page,
                    action,
                    doc.punishments.length
                );

                const newPaginated = this.utils.paginate({
                    items: doc.punishments,
                    reverse: true,
                    page
                });

                await this.responses.replyWithMessage(collected, {
                    components: [
                        this.renderPage(
                            member,
                            newPaginated.sliced,
                            {
                                start: !page,
                                left: !page,
                                right: !newPaginated.checkForNextPage,
                                end: !newPaginated.checkForNextPage
                            },
                            new ContainerBuilder(),
                            page
                        )
                    ]
                });
            });

            collector.once('end', async () => {
                if (interactionCallback.resource?.message) {
                    await this.utils.deleteMessage(
                        interactionCallback.resource.message
                    );
                }
            });
        }
    }
}
