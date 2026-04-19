import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    ContainerBuilder,
    GuildMember,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    User
} from 'discord.js';
import { Discord, Slash, SlashChoice, SlashOption } from 'discordx';
import { inject, singleton } from 'tsyringe';
import { ResponsesService } from '@src/libs/responses/Responses.service';
import { AvatarOrBannerType } from '@src/libs/users/enums/AvatarOrBannerType';
import { UtilsService } from '@src/libs/utils/Utils.service';

@Discord()
@singleton()
export class AvatarCommand {
    public constructor(
        @inject(ResponsesService) private readonly responses: ResponsesService,
        @inject(UtilsService) private readonly utils: UtilsService
    ) {}

    @Slash({
        name: 'avatar',
        description: "View member's avatar"
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
            description: 'Avatar type',
            name: 'type',
            required: false,
            type: ApplicationCommandOptionType.Number
        })
        avatarTypeOption: AvatarOrBannerType,
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
        const avatarType = avatarTypeOption ?? AvatarOrBannerType.GLOBAL;

        await this.responses.replyWithMessage(ctx, {
            components: [
                this.responses
                    .modifyContainer(new ContainerBuilder(), null, [
                        `## Member avatar — ${member.user.username}`
                    ])
                    .addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(
                                avatarType === AvatarOrBannerType.SERVER
                                    ? member.displayAvatarURL({ size: 1024 })
                                    : member.user.displayAvatarURL({
                                          size: 1024
                                      })
                            )
                        )
                    )
            ],
            flags: MessageFlags.IsComponentsV2
        });
    }
}
