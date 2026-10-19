import { inject, singleton } from 'tsyringe';
import { ConfigsStorage } from '@config';
import {
    Guild,
    GuildBasedChannel,
    GuildChannel,
    GuildChannelCreateOptions,
    GuildMember,
    GuildTextBasedChannel,
    Message,
    PermissionOverwriteOptions,
    StringSelectMenuOptionBuilder,
    User
} from 'discord.js';
import { CustomLogger } from '@src/libs/common/logger/CustomLogger';
import { PaginateDto } from '@src/libs/utils/dto/PaginateDto';
import { AnyInteraction } from '@src/libs/common/discordjs/types/AnyInteraction';
import { Client } from 'discordx';
import { PaginatorPageAction } from '@src/libs/responses/enums/PaginatorPageAction';
import { IPage } from '@src/libs/utils/interfaces/Page';

@singleton()
export class UtilsService {
    private readonly configs = ConfigsStorage;

    public constructor(
        @inject(CustomLogger) private readonly logger: CustomLogger
    ) {}

    public getParamsFromId(customId: string) {
        return customId.split(this.configs.utils.customIdSeparator);
    }

    public async getMember(guild: Guild, userId: string) {
        try {
            return await guild.members.fetch(userId);
        } catch (error) {
            return null;
        }
    }

    public async getChannel<T extends GuildBasedChannel>(
        guild: Guild,
        channelId: string
    ) {
        if (!channelId) return null;

        try {
            return (await guild.channels.fetch(channelId)) as T;
        } catch (error) {
            return null;
        }
    }

    public async getGuild(client: Client, guildId: string | null) {
        if (!guildId) return null;

        try {
            return await client.guilds.fetch(guildId);
        } catch (error) {
            return null;
        }
    }

    public paginate<T>(dto: PaginateDto<T>): IPage<T> {
        const page = dto.page ?? 0;
        const itemsOnPage = dto.itemsOnPage ?? 5;

        const from = page * itemsOnPage;
        const to = from + itemsOnPage;
        const list = dto.reverse ? dto.items.toReversed() : dto.items;
        const sliced = list.slice(from, to);
        const checkForNextPage =
            list.slice(from, to + 1).length >= itemsOnPage + 1;
        const pagesCount = Math.ceil(list.length / itemsOnPage);

        return { sliced, checkForNextPage, pagesCount, from };
    }

    public resolveCommandMemberOption(
        ctx: AnyInteraction,
        memberOption: GuildMember | User,
        required: boolean = true
    ) {
        if (required) {
            return memberOption instanceof GuildMember ? memberOption : null;
        } else {
            return memberOption instanceof GuildMember
                ? memberOption
                : ctx.member;
        }
    }

    public async createChannel<T extends GuildBasedChannel>(
        guild: Guild,
        props: GuildChannelCreateOptions
    ) {
        try {
            return (await guild.channels.create(props)) as T;
        } catch (error) {
            this.logger.handleError(error, `Cannot create channel`);
            return null;
        }
    }

    public async getMessages(channel: GuildTextBasedChannel) {
        try {
            return await channel.messages.fetch({ limit: 100 });
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot get messages from the channel with ID ${channel.id}`
            );
            return null;
        }
    }

    public calculatePageNumber(
        pageNumber: number,
        action: PaginatorPageAction,
        length: number,
        itemsOnPage: number = 5
    ) {
        switch (action) {
            case PaginatorPageAction.MOVE_START:
                return 0;
            case PaginatorPageAction.MOVE_END:
                return Math.max(Math.ceil(length / itemsOnPage) - 1, 0);
            case PaginatorPageAction.MOVE_RIGHT:
                return pageNumber + 1;
            case PaginatorPageAction.MOVE_LEFT:
                return pageNumber - 1;
        }
    }

    public async deleteMessage(message: Message<true>) {
        if (message) {
            try {
                await message.delete();
            } catch (error) {
                this.logger.handleError(
                    error,
                    `Cannot delete message with ID ${message.id}`
                );
            }
        }
    }

    public async renderMembersOptions(guild: Guild, ids: string[]) {
        const options = await Promise.all(
            ids.map(async (id) => {
                const member = await this.getMember(guild, id);

                return new StringSelectMenuOptionBuilder()
                    .setLabel(member?.displayName || 'No nickname')
                    .setValue(id);
            })
        );

        return options.length
            ? options
            : [
                  new StringSelectMenuOptionBuilder()
                      .setLabel('null')
                      .setValue('null')
              ];
    }

    public async editChannelPermissions(
        channel: GuildChannel,
        id: string,
        options: PermissionOverwriteOptions
    ) {
        try {
            await channel.permissionOverwrites.edit(id, options);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot edit permissions for ID ${id} in channel ${channel.id}`
            );
        }
    }

    public async deleteChannelPermissions(channel: GuildChannel, id: string) {
        try {
            await channel.permissionOverwrites.delete(id);
        } catch (error) {
            this.logger.handleError(
                error,
                `Cannot delete permissions for ID ${id} in channel ${channel.id}`
            );
        }
    }

    public async deleteChannelFromGuild(guild: Guild, id: string) {
        try {
            await guild.channels.delete(id);
        } catch (error) {
            this.logger.handleError(error, `Cannot delete channel ${id}`);
        }
    }
}
