import { ButtonComponent, Discord } from 'discordx';
import { inject, singleton } from 'tsyringe';
import {
    bold,
    ButtonInteraction,
    ContainerBuilder,
    MessageFlags
} from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UsersService } from '@src/libs/users/Users.service';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { ConfigsStorage } from '@config';

@Discord()
@singleton()
export class BackModerationMenuButton {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager
    ) {}

    @ButtonComponent({
        id: /^backModerationMenu-/
    })
    public async execute(ctx: ButtonInteraction<'cached'>) {
        const targetId = this.utils.getParamsFromId(ctx.customId)[1];
        const [_, target] = await Promise.all([
            ctx.deferUpdate(),
            this.utils.getMember(ctx.guild, targetId)
        ]);
        const builder = new ContainerBuilder();

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses.modifyContainer(
                        builder,
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
                    builder
                })
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
