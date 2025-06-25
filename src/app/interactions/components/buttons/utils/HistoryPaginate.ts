import { ButtonComponent, Discord } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { ButtonInteraction } from 'discord.js';
import { UtilsService } from '@src/libs/utils/Utils.service';
import { PaginatorPageAction } from '@src/libs/responses/enums/PaginatorPageAction';
import { UsersManager } from '@src/libs/common/database/users/Users.manager';
import { IPunishment } from '@src/libs/moderation/interfaces/Punishment';

@Discord()
@injectable()
export class HistoryPaginateButton {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UtilsService) private readonly utils: UtilsService,
        @inject(UsersManager) private readonly usersDatabase: UsersManager
    ) {}

    @ButtonComponent({
        id: /^punishmentsHistoryPaginator-/
    })
    public async execute(ctx: ButtonInteraction<'cached'>) {
        const executorId = this.utils.getParamsFromId(ctx.customId)[2];

        if (executorId !== ctx.user.id) return;

        await ctx.deferUpdate();

        const memberId = this.utils.getParamsFromId(ctx.customId)[3];
        const action = Number(
            this.utils.getParamsFromId(ctx.customId)[1]
        ) as PaginatorPageAction;
        let pageNumber = Number(this.utils.getParamsFromId(ctx.customId)[4]);

        const member = await this.utils.getMember(ctx.guild, memberId);

        if (!member) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle('Punishments history')
                        .setDescription('Member **not found**')
                ],
                components: []
            });
        }

        pageNumber =
            action === PaginatorPageAction.MOVE_LEFT
                ? pageNumber - 1
                : pageNumber + 1;

        const doc = await this.usersDatabase.get(memberId, ctx.guildId);
        const page = this.utils.paginate<IPunishment>({
            items: doc.history,
            page: pageNumber,
            reverse: true
        });

        return await this.responses.replyWithMessage(
            ctx,
            this.responses.generateHistoryPage({
                executor: ctx.member,
                member,
                page,
                pageNumber
            })
        );
    }
}
