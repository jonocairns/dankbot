import { getTTSProvider } from "../config";
import { OpenAITTSService } from "./openai-tts";
import { PiperTTSService } from "./piper-tts";

export interface TTSService {
	generateSpeech(
		text: string,
		voice?: string,
		signal?: AbortSignal,
	): Promise<Buffer>;
}

export enum TTSProvider {
	OPENAI = "openai",
	PIPER = "piper",
}

export function getTTSService(): TTSService {
	const provider = getTTSProvider();
	switch (provider) {
		case TTSProvider.PIPER:
			return new PiperTTSService();
		case TTSProvider.OPENAI:
			return new OpenAITTSService();
		default:
			throw new Error(`Unsupported TTS provider: ${provider}`);
	}
}
