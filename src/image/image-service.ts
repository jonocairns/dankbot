import { getImageProvider } from "../config";
import { GeminiImageService } from "./gemini-image";
import { OpenAIImageService } from "./openai-image";

export interface ImageService {
	generateImage(
		prompt: string,
		inputImageUrls?: Array<string>,
	): Promise<Buffer>;
}

export enum ImageProvider {
	OPENAI = "openai",
	GEMINI = "gemini",
}

export function getImageService(): ImageService {
	const provider = getImageProvider();
	switch (provider) {
		case "gemini":
			return new GeminiImageService();
		case "openai":
			return new OpenAIImageService();
		default: {
			const unsupported: never = provider;
			throw new Error(`Unsupported image provider: ${unsupported}`);
		}
	}
}
