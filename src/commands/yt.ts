import {
    CacheType,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
} from 'discord.js';
import {Command, CommandName} from '../util';
import {createAudioResource} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import {getPlayer} from '../getPlayer';

export const yt: Command = {
    id: CommandName.yt,
    register: new SlashCommandBuilder()
        .setName(CommandName.yt)
        .setDescription('Plays a YouTube link')
        .addStringOption((option) =>
            option
                .setName('link')
                .setDescription('The YouTube link')
                .setRequired(true)
        ),
    async run(interaction: ChatInputCommandInteraction<CacheType>) {
        const {player} = getPlayer(interaction);
        const url = interaction.options.get('link')?.value as string;

        if (!url) {
            await interaction.editReply({content: 'No link provided. Idiot'});
            return;
        }

        const stream = ytdl(url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25,
        });

        await interaction.editReply({content: `playing ${url}`});
        const resource = createAudioResource(stream);
        player.play(resource);
    },
};
