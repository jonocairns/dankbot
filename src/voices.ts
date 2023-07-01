import {donald} from './prompts/donald';
import {defaultPrompt} from './prompts/default';

export const DONALD = 'Donald Trump';

export const voices = [
	{id: 'wqRqv4HbJODrV5pOnNav', name: 'David Attenborough', system: defaultPrompt('David Attenborough')},
	{id: 'f4Zq3Zli038sY35GgOGt', name: DONALD, system: donald},
	{id: '4RDjdyE9nj8NZCRi1lJA', name: 'Joe Rogan', system: defaultPrompt('Joe Rogan')},
	{id: 'RAJktuEP17N8Q2F7Isfn', name: 'Samuel L. Jackson', system: defaultPrompt('Samuel L. Jackson')},
	{id: 'ImBAmXX0et6JPLPq4sH9', name: 'The Queen', system: defaultPrompt('The Queen')},
	{id: 'k2D1l7jcvTYuIH0Iwvp1', name: 'Kanye West', system: defaultPrompt('Kanye West')},
	{id: 'o0YpOOUFtgvoPlCDEgK6', name: 'Optimus Prime', system: defaultPrompt('Optimus Prime')},
	{id: '003Vo9stryTffMzbgB0X', name: 'Liam Neeson', system: defaultPrompt('Liam Neeson')},
	{id: '1JXjD1C9nfod6e40qVrB', name: 'Ben Shapiro', system: defaultPrompt('Ben Shapiro')},
	{id: 'Gc4CxbGocwrdV1amCaVI', name: 'Joe Biden', system: defaultPrompt('Joe Biden')},
	{id: 'PhZ4yQorrYVbCy2g0YVl', name: 'Andrew Tate', system: defaultPrompt('Andrew Tate')},
];
