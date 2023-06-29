import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {Command, CommandName} from '../util';
import {AudioPlayerStatus, createAudioResource} from '@discordjs/voice';
import {Configuration, OpenAIApi} from 'openai';
import {getPlayer} from '../getPlayer';
import axios from 'axios';
import type {AxiosRequestConfig} from 'axios';
import {logger} from '../logger';
import {system} from '../system';
import {AI_MODEL} from '../ai';

const OK = 200;

export const ask: Command = {
	id: CommandName.ask,
	register: new SlashCommandBuilder()
		.setName(CommandName.ask)
		.setDescription('Ask me anything')
		.addStringOption((option) => option.setName('ask').setDescription('The thing to ask')),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const content = interaction.options.get('ask')?.value as string;

		const configuration = new Configuration({apiKey: process.env.OPENAI_API_KEY});
		const openai = new OpenAIApi(configuration);
		const completion = await openai.createChatCompletion({
			model: AI_MODEL,
			messages: [system, {role: 'user', content}],
		});

		const text = completion.data.choices[0].message?.content;
		logger.info(`response: ${text}`);

		const payload = {
			text: text,
			model_id: 'eleven_monolingual_v1',
			voice_settings: {
				stability: 0.5,
				similarity_boost: 0.5,
			},
		};

		const options: AxiosRequestConfig<typeof payload> = {
			responseType: 'stream',
			headers: {
				'ACCEPT': 'audio/mpeg',
				'XI-API-KEY': process.env.ELEVEN_LABS_API_KEY ?? '',
				'CONTENT-TYPE': 'application/json',
			},
		};

		const url = `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_LABS_VOICE_ID}`;
		const response = await axios.post(url, payload, options);

		if (response.status !== OK) {
			logger.error(response.statusText);
			logger.error(response.data);
		}

		const {player, connection} = getPlayer(interaction);
		const resource = createAudioResource(response.data);

		resource.playStream.on('error', (error: Error) => {
			logger.error(error.message);
		});

		player.play(resource);

		player.on('stateChange', async (oldState, newState) => {
			if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
				await interaction.editReply(text ?? 'You are welcome.');
				connection.destroy();
			}
		});
	},
};
