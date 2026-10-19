import { Client, Discord, Guard, Slash, SlashOption } from 'discordx';
import { inject, singleton } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import {
    ApplicationCommandOptionType,
    bold,
    ChatInputCommandInteraction,
    ContainerBuilder,
    GuildMember,
    MessageFlags,
    PermissionFlagsBits,
    User
} from 'discord.js';
import { UsersService } from '@src/libs/users/Users.service';
import { IsModeratorGuard } from '@src/libs/moderation/guards/IsModerator.guard';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ConfigsStorage } from '@config';

@Discord()
@singleton()
@Guard(IsModeratorGuard)
export class ModerationMenuCommand {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(UsersService) private readonly users: UsersService,
        @inject(UtilsService) private readonly utils: UtilsService
    ) {}

    @Slash({
        name: 'mod-menu',
        description: 'Use moderation menu',
        defaultMemberPermissions: PermissionFlagsBits.Administrator
    })
    public async execute(
        @SlashOption({
            name: 'target',
            description: 'Member to interact with',
            type: ApplicationCommandOptionType.User,
            required: true
        })
        targetOption: GuildMember | User,
        ctx: ChatInputCommandInteraction<'cached'>,
        _client: Client,
        guardData: { builder: ContainerBuilder }
    ) {
        await ctx.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const target = this.utils.resolveCommandMemberOption(ctx, targetOption);

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        guardData.builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Moderation menu`,
                            `${ctx.user}, Selected member ${bold(`not found`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (target.id === ctx.user.id) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        guardData.builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Moderation menu`,
                            `${ctx.user}, You cannot interact ${bold(`with yourself`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        if (target.user.bot) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        guardData.builder,
                        ctx.user.displayAvatarURL({ forceStatic: true }),
                        [
                            `## Moderation menu`,
                            `${ctx.user}, You cannot interact ${bold(`with bot`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const doc = await this.usersDatabase.get(target.id, ctx.guildId, {
            activePunishments: true
        });
        const targetIsStaff = this.users.hasRoles(
            target,
            this.configs.discord.roles.staff,
            true
        );

        await this.responses.replyWithMessage(ctx, {
            components: [
                this.responses.generateModActionPanel({
                    target,
                    doc,
                    targetIsStaff,
                    builder: guardData.builder
                })
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
