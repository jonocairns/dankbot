import { OpenAITTSService } from "./openai-tts";
import { PiperTTSService } from "./piper-tts";

export interface TTSService {
	generateSpeech(text: string, voice?: string): Promise<Buffer>;
}

export enum TTSProvider {
	OPENAI = "openai",
	PIPER = "piper",
}

export function getTTSService(): TTSService {
	const provider = (
		process.env.TTS_PROVIDER || TTSProvider.OPENAI
	).toLowerCase();

	switch (provider) {
		case TTSProvider.PIPER:
			return new PiperTTSService();
		case TTSProvider.OPENAI:
		default:
			return new OpenAITTSService();
	}
}
