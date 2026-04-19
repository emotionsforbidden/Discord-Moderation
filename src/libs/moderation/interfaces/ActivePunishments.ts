export interface IActivePunishments {
    textMute: {
        status: boolean;
        expiresAt: number;
    };
    voiceMute: {
        status: boolean;
        expiresAt: number;
    };
    warns: number;
    ban: {
        status: boolean;
        expiresAt: number;
        rolesToRestore: string[];
    };
}

export const DefaultActivePunishments: IActivePunishments = {
    textMute: {
        status: false,
        expiresAt: 0
    },
    voiceMute: {
        status: false,
        expiresAt: 0
    },
    warns: 0,
    ban: {
        status: false,
        expiresAt: 0,
        rolesToRestore: []
    }
};
