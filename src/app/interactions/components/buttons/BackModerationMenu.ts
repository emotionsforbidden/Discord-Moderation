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

@Discord()
@singleton()
export class BackModerationMenuButton {
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
                        ctx.user.displayAvatarURL(),
                        [
                            `## Moderation menu`,
                            `${ctx.user}, Selected member ${bold(`not found`)}`
                        ]
                    )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const doc = await this.usersDatabase.get(target.id, ctx.guildId);
        const targetIsStaff = this.users.isStaff(target);

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
