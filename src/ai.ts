import {Message} from 'discord.js';
import {logger} from './logger';
import {Configuration, OpenAIApi} from 'openai';
import {AI_MODEL} from './commands';
import {system} from './system';

export const ai = async (message: Message, botId?: string) => {
	message.channel.sendTyping();

	try {
		const configuration = new Configuration({
			apiKey: process.env.OPENAI_API_KEY,
		});
		const openai = new OpenAIApi(configuration);
		const prompt = message.content.replace(`<@${botId}>`, '').trim();
		const completion = await openai.createChatCompletion({
			model: AI_MODEL,
			messages: [...system, {role: 'user', content: prompt}],
		});

		const content = completion.data.choices[0].message?.content;
		await message.reply({content});
	} catch (err) {
		logger.error(err);
		message.reply({
			content: 'I may or may not have shat myself...',
		});
	}
};
