import {CacheType, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder} from 'discord.js';
import {Command, CommandName} from '../util';
import {createAudioResource} from '@discordjs/voice';
import {ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi} from 'openai';
import {UNABLE_TO_CONNECT_ERROR, getPlayer} from '../getPlayer';
import {logger} from '../logger';
import {AI_MODEL} from '../ai';
import {Readable} from 'stream';
import fetch from 'node-fetch';
import {voices} from '../voices';
const {User} = ChatCompletionRequestMessageRoleEnum;

const OK = 200;
const OPTIONS = {
	ask: {
		name: 'ask',
		description: 'The thing to ask',
	},
	person: {
		name: 'person',
		description: 'The person you want to ask',
	},
};
const MODEL = 'eleven_monolingual_v1';

export const ask: Command = {
	id: CommandName.ask,
	register: new SlashCommandBuilder()
		.setName(CommandName.ask)
		.setDescription('Ask me anything')
		.addStringOption((option) =>
			option.setName(OPTIONS.ask.name).setDescription(OPTIONS.ask.description).setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName(OPTIONS.person.name)
				.setDescription(OPTIONS.person.description)
				.addChoices(...voices.map((v) => ({name: v.name, value: v.name})))
		),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const content = interaction.options.get(OPTIONS.ask.name)?.value as string;
		const personName = interaction.options.get(OPTIONS.person.name)?.value;
		const randomId = voices[Math.floor(Math.random() * voices.length)].id;
		const voiceId = voices.find((v) => v.name === personName)?.id;
		const personId = voiceId ?? randomId;

		const configuration = new Configuration({apiKey: process.env.OPENAI_API_KEY});
		const openai = new OpenAIApi(configuration);
		const sys = voices.filter((p) => p.id === personId).map((p) => p.system);
		const canJoin = (interaction.member as GuildMember)?.voice?.channel?.id;

		if (!canJoin) {
			await interaction.editReply(UNABLE_TO_CONNECT_ERROR);
			return;
		}

		const completion = await openai.createChatCompletion({
			model: AI_MODEL,
			messages: [...sys, {role: User, content}],
		});

		const text = completion.data.choices[0].message?.content;
		logger.info(`voice: ${personId}:${voices.find((v) => v.id === personId)?.name}`);
		logger.info(`response: ${text}`);

		const payload = {
			text: text,
			model_id: MODEL,
			voice_settings: {
				stability: 0.5,
				similarity_boost: 0.5,
			},
		};

		const url = `https://api.elevenlabs.io/v1/text-to-speech/${personId}/stream`;

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
