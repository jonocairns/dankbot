import {GeminiImageService} from './gemini-image';
import {OpenAIImageService} from './openai-image';

export interface ImageService {
	generateImage(prompt: string): Promise<Buffer>;
}

export enum ImageProvider {
	OPENAI = 'openai',
	GEMINI = 'gemini',
}

export function getImageService(): ImageService {
	const provider = (process.env.IMAGE_PROVIDER || ImageProvider.OPENAI).toLowerCase();

	switch (provider) {
		case ImageProvider.GEMINI:
			return new GeminiImageService();
		case ImageProvider.OPENAI:
		default:
			return new OpenAIImageService();
	}
}
