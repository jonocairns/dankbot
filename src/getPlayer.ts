import {createAudioPlayer, joinVoiceChannel} from '@discordjs/voice';
import {CacheType, ChatInputCommandInteraction, GuildMember} from 'discord.js';
import {logger} from './logger';

const UNABLE_TO_CONNECT_ERROR =
    'I cannot play sounds due to reasons above what your simple mind can handle';

export const getPlayer = (
    interaction: ChatInputCommandInteraction<CacheType>
) => {
    const {member, guild, guildId} = interaction;
    const voiceChannel = (member as GuildMember)?.voice?.channel?.id;
    const player = createAudioPlayer();

    const canJoin = !voiceChannel || !guildId || !guild?.voiceAdapterCreator;

    if (canJoin) {
        interaction.reply({
            content: UNABLE_TO_CONNECT_ERROR,
        });
        throw new Error(`Unable to join voice channel`);
    }

    const connection = joinVoiceChannel({
        channelId: voiceChannel,
        guildId: guildId,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    });

    connection.subscribe(player);

    player.on('error', (error) => {
        logger.error(error);
    });

    return {player, connection};
};