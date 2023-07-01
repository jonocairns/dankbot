import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {Command, CommandName} from '../util';
import {createAudioResource} from '@discordjs/voice';
import {Configuration, OpenAIApi} from 'openai';
import {getPlayer} from '../getPlayer';
import {logger} from '../logger';
import {AI_MODEL} from '../ai';
import {Readable} from 'stream';
import fetch from 'node-fetch';
import {DONALD, voices} from '../voices';

const OK = 200;
const RANDOM = 'random';

export const ask: Command = {
	id: CommandName.ask,
	register: new SlashCommandBuilder()
		.setName(CommandName.ask)
		.setDescription('Ask me anything')
		.addStringOption((option) => option.setName('ask').setDescription('The thing to ask').setRequired(true))
		.addStringOption((option) =>
			option
				.setName('person')
				.setDescription('The person you want to ask')
				.addChoices(...voices.map((v) => ({name: v.name, value: v.id})), {name: 'Random', value: RANDOM})
		),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const content = interaction.options.get('ask')?.value as string;
		const selected = interaction.options.get('person')?.value;
		const random = voices[Math.floor(Math.random() * voices.length)].id;

		const person = selected === RANDOM ? random : selected ?? voices.find((v) => v.name === DONALD)?.id;
		const configuration = new Configuration({apiKey: process.env.OPENAI_API_KEY});
		const openai = new OpenAIApi(configuration);
		const sys = voices.filter((p) => p.id === person).map((p) => p.system);

		const completion = await openai.createChatCompletion({
			model: AI_MODEL,
			messages: [...sys, {role: 'user', content}],
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

		const url = `https://api.elevenlabs.io/v1/text-to-speech/${person}/stream`;

		const response = await fetch(url, {
			headers: {
				'ACCEPT': 'audio/mp3',
				'XI-API-KEY': process.env.ELEVEN_LABS_API_KEY ?? '',
				'CONTENT-TYPE': 'application/json',
			},
			body: JSON.stringify(payload),
			method: 'POST',
		});

		if (response.status !== OK) {
			logger.error(response.statusText);
			const text = await response.json();
			logger.error(text);
		} else {
			logger.info(`getting tts response buffer...`);
			const buffer = await response.buffer();

			logger.info(`creating readable stream...`);
			const stream = Readable.from(buffer);

			const {player} = getPlayer(interaction);
			const resource = createAudioResource(stream);

			resource.playStream.on('error', (error: Error) => {
				logger.error(error.message);
			});

			logger.info(`attempting to play...`);
			player.play(resource);
		}

		await interaction.editReply(text ?? 'You are welcome.');
	},
};
