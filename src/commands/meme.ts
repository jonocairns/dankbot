import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {Command, CommandName} from '../util';
import {sounds} from '../';
import {createAudioResource} from '@discordjs/voice';
import {createReadStream} from 'fs';
import {getPlayer} from '../getPlayer';
import {logger} from '../logger';
import {cleanUp} from '../cleanUp';

export const meme: Command = {
	id: CommandName.meme,
	register: new SlashCommandBuilder()
		.setName(CommandName.meme)
		.setDescription('Plays a dank meme')
		.addStringOption((option) => option.setName('meme').setDescription('A specific meme')),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const input = interaction.options.get('meme')?.value as string;

		let sound = sounds[Math.floor(Math.random() * sounds.length)];
		if (input) {
			const inputSound = sounds.find((s) => s.split('.')[0] === input);
			if (inputSound) {
				sound = inputSound;
			} else {
				await interaction.editReply(`'${input}' does not exist you dummy`);
				return;
			}
		}
		const meme = sound.split('.')[0];
		await interaction.editReply(`memed '${meme}'`);
		logger.info(`${interaction.member?.user.id} triggered ${meme}`);
		const {player} = getPlayer(interaction);
		const stream = createReadStream(`./sounds/${sound}`);
		const resource = createAudioResource(stream);
		player.play(resource);
		await cleanUp(interaction);
	},
};
