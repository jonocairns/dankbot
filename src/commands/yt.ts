import {CacheType, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder} from 'discord.js';
import {Command, CommandName} from '../util';
import {createAudioResource} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import {UNABLE_TO_CONNECT_ERROR, getPlayer} from '../getPlayer';
import {cleanUp} from '../cleanUp';

export const yt: Command = {
	id: CommandName.yt,
	register: new SlashCommandBuilder()
		.setName(CommandName.yt)
		.setDescription('Plays a YouTube link')
		.addStringOption((option) => option.setName('link').setDescription('The YouTube link').setRequired(true)),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const {player} = getPlayer(interaction);
		const url = interaction.options.get('link')?.value as string;
		const canJoin = (interaction.member as GuildMember)?.voice?.channel?.id;

		if (!canJoin) {
			await interaction.editReply(UNABLE_TO_CONNECT_ERROR);
			return;
		}

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
		await cleanUp(interaction);
	},
};
