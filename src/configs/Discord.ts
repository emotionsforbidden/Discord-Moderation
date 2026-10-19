export const DiscordConfig = {
    guildId: '', // server
    apiUrl: 'https://discord.com/api/',
    cdnUrl: 'https://cdn.discordapp.com/',
    roles: {
        textMute: '', // text mute role
        voiceMute: '', // voice mute role
        ban: '', // ban role
        member: '', // member role
        keepAfterBan: [''], // roles to keep after ban
        canInteract: [''], // roles to interact with moderation commands
        staff: [''], // staff role
        reports: {
            all: [''], // permissions for default reports
            high: [''] // permissions for staff reports
        }
    },
    channels: {
        reports: {
            text: '', // channel for reports
            category: '' // category for reports
        },
        logs: {
            moderation: '', // channel for moderation logs
            reports: '' // channel for reports logs
        }
    }
};
