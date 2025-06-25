import {
    CommandInteraction,
    MessageComponentInteraction,
    ModalSubmitInteraction
} from 'discord.js';

export type AnyInteraction =
    | CommandInteraction<'cached'>
    | MessageComponentInteraction<'cached'>
    | ModalSubmitInteraction<'cached'>;
