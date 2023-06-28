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

const LIMIT = 100;
const BOT_NAME = '@realDonaldTrump';

export const ai = async ({message, botId}: Input) => {
	message.channel.sendTyping();
	const messages: Array<ChatCompletionRequestMessage> = [];

	try {
		const isThread = message.channel.isThread();
		const prompt = getContent({message, botId});
		if (isThread) {
			if (message.channel.archived) {
				return;
			}
			const thread = await message.channel.messages.fetch({limit: LIMIT});

			if (thread.size >= LIMIT) {
				await message.reply({content: `I'm sick of this thread. I'm off to try bigly and betterly things.`});
				await message.channel.setArchived(true, `This is beneath me. I have a country to run.`);
				return;
			}
			messages.push(...prepareThread({thread, botId}));
			messages.reverse();
		} else {
			messages.push({role: User, content: prompt});
		}
		const content = await request(messages);
		await message.reply({content});
	} catch (err) {
		logger.error(JSON.stringify(err));
		logger.info(messages);
		message.reply({content: 'I may or may not have shat myself...'});
	}
};

const getContent = ({message, botId}: {message: Message; botId: string}) =>
	message.content.replace(`<@${botId}>`, BOT_NAME).trim();

const request = async (messages: Array<ChatCompletionRequestMessage>) => {
	const configuration = new Configuration({apiKey: process.env.OPENAI_API_KEY});
	const openai = new OpenAIApi(configuration);

	const completion = await openai.createChatCompletion({
		model: AI_MODEL,
		messages: [system, ...messages],
	});

	return (
		completion.data.choices[0].message?.content ??
		`My response requires a bigly IQ, so bigly that you wouldn't understand. Sad!`
	);
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
			const {bot, username} = t.author;
			const author = bot ? '' : `${username} said `;

			return {
				role: bot ? Assistant : User,
				content: `${author}${content}`,
				name: bot ? BOT_NAME.replace('@', '') : username,
			};
		});
