import { Discord, ModalComponent } from 'discordx';
import { inject, singleton } from 'tsyringe';
import {
    bold,
    ContainerBuilder,
    MessageFlags,
    ModalSubmitInteraction
} from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { ModerationService } from '@src/libs/moderation/Moderation.service';

@Discord()
@singleton()
export class ModerationPunishmentRemoveWarnModal {
    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(ModerationService)
        private readonly moderation: ModerationService
    ) {}

    @ModalComponent({
        id: /^moderationPunishmentRemoveWarn-/
    })
    public async execute(ctx: ModalSubmitInteraction<'cached'>) {
        const targetId = this.utils.getParamsFromId(ctx.customId)[1];
        const [_, target] = await Promise.all([
            ctx.deferUpdate(),
            this.utils.getMember(ctx.guild, targetId)
        ]);
        const reason = ctx.fields.getTextInputValue('reason');

        const builder = new ContainerBuilder();

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses
                        .modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Warning removal`,
                                `${ctx.user}, Selected member ${bold(`not found`)}`
                            ]
                        )
                        .addActionRowComponents((actionRow) =>
                            actionRow.setComponents(
                                this.responses.generateBackButton(
                                    `ModerationMenu`,
                                    [targetId]
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const doc = await this.usersDatabase.get(targetId, ctx.guildId, {
            snowflake: {
                id: true
            },
            activePunishments: true
        });

        if (!doc.activePunishments.warns) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses
                        .modifyContainer(
                            builder,
                            ctx.user.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Warning removal`,
                                `${ctx.user}, ${target} ${bold(`doesn't have`)} warnings`
                            ]
                        )
                        .addActionRowComponents((actionRow) =>
                            actionRow.setComponents(
                                this.responses.generateBackButton(
                                    `ModerationMenu`,
                                    [targetId]
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }

        await Promise.all([
            this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses
                        .modifyContainer(
                            builder,
                            target.displayAvatarURL({ forceStatic: true }),
                            [
                                `## Warning removal`,
                                `${ctx.user}, You ${bold(`removed warning`)} from ${target}`,
                                `-# - ${bold(`Reason:`)} ${reason}`
                            ]
                        )
                        .addActionRowComponents((actionRow) =>
                            actionRow.setComponents(
                                this.responses.generateBackButton(
                                    `ModerationMenu`,
                                    [targetId]
                                )
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2
            }),
            this.moderation.removeWarn({
                target,
                doc,
                reason,
                executor: ctx.member
            })
        ]);
    }
}
