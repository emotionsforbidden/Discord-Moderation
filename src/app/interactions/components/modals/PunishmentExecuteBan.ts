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
import ms from 'ms';
import { DateService } from '@src/libs/common/date/Date.service';
import { TransformersService } from '@src/libs/transformers/Transformers.service';
import { ModerationService } from '@src/libs/moderation/Moderation.service';

@Discord()
@singleton()
export class ModerationPunishmentExecuteBanModal {
    public constructor(
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager,
        @inject(DateService) private readonly date: DateService,
        @inject(TransformersService)
        private readonly transformers: TransformersService,
        @inject(ModerationService)
        private readonly moderation: ModerationService
    ) {}

    @ModalComponent({
        id: /^moderationPunishmentExecuteBan-/
    })
    public async execute(ctx: ModalSubmitInteraction<'cached'>) {
        const targetId = this.utils.getParamsFromId(ctx.customId)[1];
        const [_, target] = await Promise.all([
            ctx.deferUpdate(),
            this.utils.getMember(ctx.guild, targetId)
        ]);
        const reason = ctx.fields.getTextInputValue('reason');

        const duration = ms(ctx.fields.getTextInputValue('duration'));
        const builder = new ContainerBuilder();

        if (!target) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses
                        .modifyContainer(builder, ctx.user.displayAvatarURL(), [
                            `## Ban execute`,
                            `${ctx.user}, Selected member ${bold(`not found`)}`
                        ])
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

        if (Math.floor(duration) / 1000 <= 0 || isNaN(duration)) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses
                        .modifyContainer(builder, ctx.user.displayAvatarURL(), [
                            `## Ban execute`,
                            `${ctx.user}, Choose duration ${bold(`between 1 and 30 days`)}`
                        ])
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

        if (duration < ms('1d') || duration > ms('30d')) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses
                        .modifyContainer(builder, ctx.user.displayAvatarURL(), [
                            `## Ban execute`,
                            `${ctx.user}, Choose duration ${bold(`between 1 and 30 days`)}`
                        ])
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

        const doc = await this.usersDatabase.get(targetId, ctx.guildId);

        if (doc.activePunishments.ban.status) {
            return await this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses
                        .modifyContainer(builder, ctx.user.displayAvatarURL(), [
                            `## Ban execute`,
                            `${ctx.user}, ${target} already ${bold(`has ban`)}`
                        ])
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

        const endsAt = this.date.nowTimestamp() + duration;

        await Promise.all([
            this.responses.replyWithMessage(ctx, {
                components: [
                    this.responses
                        .modifyContainer(builder, target.displayAvatarURL(), [
                            `## Ban execute`,
                            `${ctx.user}, You have ${bold(`successfully banned`)} ${target}`,
                            [
                                `-# - ${bold(`Reason:`)}: ${reason}`,
                                `-# - ${bold(`Expires:`)}: <t:${this.transformers.toSeconds(endsAt)}:f>`
                            ].join(`\n`)
                        ])
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
            this.moderation.executeBan({
                target,
                doc,
                endsAt,
                reason,
                executor: ctx.member
            })
        ]);
    }
}
