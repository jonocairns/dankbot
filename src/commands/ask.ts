import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {Command, CommandName} from '../util';
import {createAudioResource} from '@discordjs/voice';
import {Configuration, OpenAIApi} from 'openai';
import {getPlayer} from '../getPlayer';
import axios from 'axios';

const AI_MODEL = 'text-davinci-003';

const CLONED_VOICES_API_URL = 'https://play.ht/api/v2/cloned-voices';
const TTS_STREAM_API_URL = 'https://play.ht/api/v2/tts/stream';

export const ask: Command = {
	id: CommandName.ask,
	register: new SlashCommandBuilder()
		.setName(CommandName.ask)
		.setDescription('Ask me anything')
		.addStringOption((option) => option.setName('ask').setDescription('The thing to ask')),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const prompt = interaction.options.get('ask')?.value as string;

		const configuration = new Configuration({
			apiKey: process.env.OPENAI_API_KEY,
		});
		const openai = new OpenAIApi(configuration);
		const completion = await openai.createCompletion({
			model: AI_MODEL,
			prompt: `respond to the following question like donald trump would but include funny shit talking and offensive language: "${prompt}"`,
			max_tokens: 2048,
		});

		const text = completion.data.choices[0].text;

		console.log(`response: ${text}`);

		const payload = {
			text,
			voice: process.env.PLAY_HT_VOICE,
			speed: 1,
			quality: 'draft',
		};

		const response = await axios.post(TTS_STREAM_API_URL, payload, {
			headers: {
				'AUTHORIZATION': `Bearer ${process.env.PLAY_HT_API_KEY}`,
				'X-USER-ID': process.env.PLAY_HT_USER_ID ?? '',
				'ACCEPT': 'audio/mpeg',
				'CONTENT-TYPE': 'application/json',
			},
			responseType: 'stream',
		});

		const {player} = getPlayer(interaction);
		const resource = createAudioResource(response.data);
		player.play(resource);

		await interaction.editReply(text ?? 'You are welcome.');
	},
};

export const getClonedVoices = async () => {
	const options = {
		headers: {
			'AUTHORIZATION': `Bearer ${process.env.PLAY_HT_API_KEY}`,
			'X-USER-ID': process.env.PLAY_HT_USER_ID ?? '',
			'ACCEPT': 'application/json',
		},
	};

	const voices = await axios.get(CLONED_VOICES_API_URL, options);

	console.log(voices);
};
