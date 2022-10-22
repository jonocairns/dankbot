import {
    AudioPlayerStatus,
    createAudioPlayer,
    joinVoiceChannel,
} from '@discordjs/voice';
import {CacheType, ChatInputCommandInteraction, GuildMember} from 'discord.js';
import {logger} from './logger';

export const getPlayer = (
    interaction: ChatInputCommandInteraction<CacheType>
) => {
    const {member, guild, guildId} = interaction;
    const voiceChannel = (member as GuildMember)?.voice?.channel?.id;
    const player = createAudioPlayer();
    logger.info(`Creating audio player`);

    const canJoin = !voiceChannel || !guildId || !guild?.voiceAdapterCreator;

    if (canJoin) {
        interaction.reply({
            content:
                'I cannot play sounds due to reasons above what your simple mind can handle',
        });
        throw new Error(`Unable to join voice channel`);
    }

    logger.info(`Joining voice channel`);
    const connection = joinVoiceChannel({
        channelId: voiceChannel,
        guildId: guildId,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
    });

    logger.info(`Subscribing to player`);
    connection.subscribe(player);

    player.on('error', (error) => {
        logger.error(error);
    });

    player.on(AudioPlayerStatus.Playing, () => {
        logger.info('The audio player has started playing!');
    });

    return {player, connection};
};
