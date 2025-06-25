import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags,
    User
} from 'discord.js';
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx';
import { inject, injectable } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { UsersService } from '@src/libs/users/Users.service';
import { AvatarOrBannerType } from '@src/libs/users/enums/AvatarOrBannerType';
import { UtilsService } from '@src/libs/utils/Utils.service';

@Discord()
@injectable()
export class BannerCommand {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UsersService) private readonly users: UsersService,
        @inject(UtilsService) private readonly utils: UtilsService
    ) {}

    @Slash({
        name: 'banner',
        description: "View member's banner"
    })
    public async execute(
        @SlashOption({
            description: 'Member to interact with',
            name: 'member',
            required: false,
            type: ApplicationCommandOptionType.User
        })
        memberOption: GuildMember | User,

        @SlashChoice({ name: 'Global', value: AvatarOrBannerType.GLOBAL })
        @SlashChoice({ name: 'Server', value: AvatarOrBannerType.SERVER })
        @SlashOption({
            description: 'Banner type',
            name: 'type',
            required: false,
            type: ApplicationCommandOptionType.Number
        })
        bannerTypeOption: AvatarOrBannerType,
        ctx: ChatInputCommandInteraction<'cached'>
    ) {
        await ctx.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const member = this.utils.resolveCommandMemberOption(
            ctx,
            memberOption,
            false
        ) as GuildMember;
        const bannerType = bannerTypeOption ?? AvatarOrBannerType.GLOBAL;
        const bannerURL = await this.users.getUserBanner(member, bannerType);

        if (!bannerURL) {
            return await this.responses.replyWithMessage(ctx, {
                embeds: [
                    this.responses
                        .getEmbedTemplate(ctx.member.displayAvatarURL())
                        .setTitle(`Member banner — ${member.user.displayName}`)
                        .setDescription("Member **doesn't have** banner")
                ]
            });
        }

        return await this.responses.replyWithMessage(ctx, {
            embeds: [
                this.responses
                    .getEmbedTemplate(null)
                    .setImage(bannerURL)
                    .setTitle(`Member banner — ${member.user.displayName}`)
            ]
        });
    }
}
