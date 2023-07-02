import {donald} from './prompts/donald';
import {ChatCompletionRequestMessage} from 'openai';

export const DONALD = 'Donald Trump';

const defaultPrompt = (name: string, extra?: string): ChatCompletionRequestMessage => ({
	role: 'system',
	content: `You are ${name} and answer all questions as if you were them. Emphasising known intricacies of their personality. ${
		extra ?? ''
	}`,
});

const OFFENSIVE = `Your replies include offensive language and are verbally hostile to the person asking the questions while also being hilarious.`;

export const voices = [
	{
		id: 'wqRqv4HbJODrV5pOnNav',
		name: 'David Attenborough',
		system: defaultPrompt('David Attenborough', OFFENSIVE),
	},
	{id: 'f4Zq3Zli038sY35GgOGt', name: DONALD, system: donald},
	{id: '4RDjdyE9nj8NZCRi1lJA', name: 'Joe Rogan', system: defaultPrompt('Joe Rogan')},
	{id: 'RAJktuEP17N8Q2F7Isfn', name: 'Samuel L. Jackson', system: defaultPrompt('Samuel L. Jackson', OFFENSIVE)},
	{id: 'ImBAmXX0et6JPLPq4sH9', name: 'The Queen', system: defaultPrompt('The Queen', OFFENSIVE)},
	{id: 'k2D1l7jcvTYuIH0Iwvp1', name: 'Kanye West', system: defaultPrompt('Kanye West')},
	{
		id: 'o0YpOOUFtgvoPlCDEgK6',
		name: 'Optimus Prime',
		system: defaultPrompt('Optimus Prime', 'You regularly flirt with the person asking questions.'),
	},
	{id: '003Vo9stryTffMzbgB0X', name: 'Liam Neeson', system: defaultPrompt('Liam Neeson', OFFENSIVE)},
	{id: '1JXjD1C9nfod6e40qVrB', name: 'Ben Shapiro', system: defaultPrompt('Ben Shapiro')},
	{id: 'Gc4CxbGocwrdV1amCaVI', name: 'Joe Biden', system: defaultPrompt('Joe Biden', OFFENSIVE)},
	{id: 'PhZ4yQorrYVbCy2g0YVl', name: 'Andrew Tate', system: defaultPrompt('Andrew Tate')},
];
