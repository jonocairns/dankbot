import { Collection, Message } from "discord.js";
import OpenAI from "openai";
import { getAIModel } from "./config";
import { donald } from "./prompts/donald";
import {
	AI_TIMEOUT_MS,
	MAX_COMPLETION_TOKENS,
	MAX_CONTEXT_LENGTH,
	validatePrompt,
} from "./security";

interface Input {
	message: Message;
	botId: string;
}

const LIMIT = 100;
const BOT_NAME = "@realDonaldTrump";

export const ai = async ({ message, botId }: Input) => {
	const messages: Array<OpenAI.Chat.ChatCompletionMessageParam> = [];

	const isThread = message.channel.isThread();
	const prompt = getContent({ message, botId });
	validatePrompt(prompt);
	if (isThread) {
		if (message.channel.locked) {
			return;
		}
		await message.channel.sendTyping();
		const thread = await message.channel.messages.fetch({ limit: LIMIT });

		messages.push(...prepareThread({ thread, botId }));
		messages.reverse();
	} else {
		messages.push({ role: "user", content: prompt });
	}
	const content = await request(messages);
	await message.reply({ content });
};

const getContent = ({ message, botId }: { message: Message; botId: string }) =>
	message.content.replace(`<@${botId}>`, BOT_NAME).trim();

const request = async (
	messages: Array<OpenAI.Chat.ChatCompletionMessageParam>,
) => {
	const openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
		timeout: AI_TIMEOUT_MS,
		maxRetries: 0,
	});

	const completion = await openai.chat.completions.create({
		model: getAIModel(),
		max_completion_tokens: MAX_COMPLETION_TOKENS,
		messages: [donald, ...messages],
	});

	return (
		completion.choices[0]?.message?.content?.slice(0, 2000) ??
		`My response requires a bigly IQ, so bigly that you wouldn't understand. Sad!`
	);
};

interface MapThreadInput {
	botId: string;
	thread: Collection<string, Message>;
}

export const prepareThread = ({ thread, botId }: MapThreadInput) => {
	let remaining = MAX_CONTEXT_LENGTH;
	return thread
		.filter((f) => {
			const mentionsBot = f.mentions.members?.find((f) => f.id === botId);
			const isBot = f.author.id === botId;
			return mentionsBot || isBot;
		})
		.map((t) => {
			const content = getContent({ message: t, botId });
			const { username } = t.author;
			const bot = t.author.id === botId;
			const author = bot ? "" : `${username} said `;
			const text = `${author}${content}`.slice(0, remaining);
			remaining -= text.length;

			return {
				role: bot ? ("assistant" as const) : ("user" as const),
				content: text,
			};
		})
		.filter((message) => message.content.length > 0);
};
