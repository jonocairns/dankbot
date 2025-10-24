import OpenAI from 'openai';

const defaultPrompt: OpenAI.Chat.ChatCompletionSystemMessageParam = {
	role: 'system',
	content:
		'Your replies include offensive language and are verbally hostile to the person asking the questions while also being hilarious.',
};

export const voices = [
	{
		name: 'Default',
		system: defaultPrompt,
	},
];
