import { inject, injectable } from 'tsyringe';
import { ConfigsStorage } from '@config';
import {
    Guild,
    GuildBasedChannel,
    GuildChannelCreateOptions,
    GuildMember,
    GuildTextBasedChannel,
    User
} from 'discord.js';
import { CustomLogger } from '@src/libs/common/logger/Logger';
import { PaginateDto } from '@src/libs/utils/dto/PaginateDto';
import { AnyInteraction } from '@src/libs/common/discordjs/types/AnyInteraction';

@injectable()
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
            this.logger.handleError(error, `Unknown member with ID ${userId}`);
            return null;
        }
    }

    public async getRole(guild: Guild, roleId: string) {
        if (!roleId) return null;

        try {
            return await guild.roles.fetch(roleId);
        } catch (error) {
            this.logger.handleError(error, `Unknown role with ID ${roleId}`);
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
            this.logger.handleError(
                error,
                `Unknown channel with ID ${channelId}`
            );
            return null;
        }
    }

    public paginate<T>(dto: PaginateDto<T>) {
        const page = dto.page ?? 0;
        const itemsOnPage = dto.itemsOnPage ?? 5;

        const from = page * itemsOnPage;
        const to = from + itemsOnPage;
        const list = dto.reverse ? dto.items.reverse() : dto.items;
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

    public async createChannel(guild: Guild, props: GuildChannelCreateOptions) {
        try {
            return await guild.channels.create(props);
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
}
