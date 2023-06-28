import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {Command, CommandName} from '../util';
import {createAudioResource} from '@discordjs/voice';
import {Configuration, OpenAIApi} from 'openai';
import {getPlayer} from '../getPlayer';
import axios from 'axios';

const AI_MODEL = 'text-davinci-003';

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

		const response = await axios.get(
			`http://[::1]:5002//api/tts?text=${text ?? 'Nothing'}&speaker_id=ED&style_wav=&language_id=`,
			{responseType: 'stream'}
		);

		const {player} = getPlayer(interaction);
		console.log('streaming...');
		const resource = createAudioResource(response.data);
		player.play(resource);

		await interaction.editReply(text ?? 'You are welcome.');
	},
};
