import OpenAI from 'openai';
import {TTSService} from './tts-service';
import {logger} from '../logger';

export class OpenAITTSService implements TTSService {
	private client: OpenAI;

	constructor() {
		this.client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
	}

	async generateSpeech(text: string, voice: string = 'onyx'): Promise<Buffer> {
		logger.info(`Generating speech with OpenAI TTS using voice: ${voice}...`);

		const mp3Response = await this.client.audio.speech.create({
			model: 'tts-1',
			voice: voice as 'onyx' | 'alloy' | 'echo' | 'fable' | 'nova' | 'shimmer',
			input: text,
		});

		logger.info('Converting audio response to buffer...');
		const buffer = Buffer.from(await mp3Response.arrayBuffer());

		return buffer;
	}
}
