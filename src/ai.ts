import {Collection, Message} from 'discord.js';
import {logger} from './logger';
import {ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi} from 'openai';
import {system} from './system';

export const AI_MODEL = 'gpt-3.5-turbo';

const {Assistant, User} = ChatCompletionRequestMessageRoleEnum;

interface Input {
	message: Message;
	botId: string;
}

export const ai = async ({message, botId}: Input) => {
	message.channel.sendTyping();

	try {
		const isThread = message.channel.isThread();
		const prompt = getContent({message, botId});
		const messages: Array<ChatCompletionRequestMessage> = [];
		if (isThread) {
			const thread = await message.channel.messages.fetch();
			messages.push(...prepareThread({thread, botId}));
			messages.reverse();
		} else {
			messages.push({role: User, content: prompt});
		}
		const content = await request(messages);
		await message.reply({content});
	} catch (err) {
		logger.error(err);
		message.reply({content: 'I may or may not have shat myself...'});
	}
};

const getContent = ({message, botId}: {message: Message; botId: string}) =>
	message.content.replace(`<@${botId}>`, `@realDonaldTrump`).trim();

const request = async (messages: Array<ChatCompletionRequestMessage>) => {
	const configuration = new Configuration({apiKey: process.env.OPENAI_API_KEY});
	const openai = new OpenAIApi(configuration);

	const completion = await openai.createChatCompletion({
		model: AI_MODEL,
		messages: [...system, ...messages],
	});

	return completion.data.choices[0].message?.content;
};

interface MapThreadInput {
	botId: string;
	thread: Collection<string, Message>;
}

const prepareThread = ({thread, botId}: MapThreadInput) =>
	thread
		.filter((f) => {
			const mentionsBot = f.mentions.members?.find((f) => f.id === botId);
			const isBot = f.author.bot;
			return mentionsBot || isBot;
		})
		.map((t) => {
			const content = getContent({message: t, botId});
			return {
				role: t.author.bot ? Assistant : User,
				content,
			};
		});
