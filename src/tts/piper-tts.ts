import { getPiperConnection } from "../config";
import { logger } from "../logger";
import { pcmToWav } from "./audio-utils";
import { TTSService } from "./tts-service";
import { WyomingClient } from "./wyoming-client";

export class PiperTTSService implements TTSService {
	private client: WyomingClient;

	constructor() {
		const { host, port } = getPiperConnection();
		this.client = new WyomingClient(host, port);
		logger.info(
			`Piper TTS service initialized with Wyoming server: ${host}:${port}`,
		);
	}

	async generateSpeech(
		text: string,
		voice?: string,
		signal?: AbortSignal,
	): Promise<Buffer> {
		logger.info(`Generating speech with Piper TTS via Wyoming protocol...`);

		try {
			const pcmData = await this.client.synthesize(text, voice, signal);
			logger.info(
				`Received ${pcmData.length} bytes of PCM audio from Piper TTS`,
			);

			// Convert raw PCM to WAV format for Discord
			const wavAudio = pcmToWav(pcmData);
			logger.info(`Converted to WAV format: ${wavAudio.length} bytes`);

			return wavAudio;
		} catch (error) {
			logger.error(`Failed to generate speech with Piper TTS: ${error}`);
			throw error;
		}
	}
}
