import { GoogleGenAI } from "@google/genai";
import { logger } from "../logger";
import {
	AI_TIMEOUT_MS,
	RequestRejectedError,
	validatePrompt,
} from "../security";
import { decodeGeneratedImage, downloadDiscordImage } from "./download-image";
import { ImageService } from "./image-service";

export class GeminiImageService implements ImageService {
	private client: GoogleGenAI;
	private model: string;

	constructor() {
		if (!process.env.GOOGLE_API_KEY) {
			throw new Error(
				"GOOGLE_API_KEY environment variable is required for Gemini image generation",
			);
		}

		this.client = new GoogleGenAI({ httpOptions: { timeout: AI_TIMEOUT_MS } });
		this.model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
		logger.info(`Initialized Gemini image service with model: ${this.model}`);
	}

	async generateImage(
		prompt: string,
		inputImageUrls?: Array<string>,
	): Promise<Buffer> {
		validatePrompt(prompt);
		if (inputImageUrls && inputImageUrls.length > 1)
			throw new RequestRejectedError("Please attach only one image.");
		logger.info(`Generating image with Gemini model ${this.model}`);

		try {
			let contents:
				| string
				| Array<{
						text?: string;
						inlineData?: { mimeType: string; data: string };
				  }>;

			if (inputImageUrls && inputImageUrls.length > 0) {
				logger.info(
					`Processing ${inputImageUrls.length} input image(s) with prompt`,
				);

				const parts: Array<{
					text?: string;
					inlineData?: { mimeType: string; data: string };
				}> = [{ text: prompt }];

				for (const imageUrl of inputImageUrls) {
					const { buffer, mimeType } = await downloadDiscordImage(imageUrl);
					parts.push({
						inlineData: { mimeType, data: buffer.toString("base64") },
					});
				}

				contents = parts;
			} else {
				contents = prompt;
			}

			const response = await this.client.models.generateContent({
				model: this.model,
				contents: contents,
			});

			if (!response.candidates || response.candidates.length === 0) {
				throw new Error("No candidates returned from Gemini API");
			}

			const candidate = response.candidates[0];
			if (!candidate.content || !candidate.content.parts) {
				throw new Error("No content parts in Gemini response");
			}

			const parts = candidate.content.parts;

			for (const part of parts) {
				if (part.inlineData && part.inlineData.data) {
					const imageData = part.inlineData.data;
					const buffer = decodeGeneratedImage(imageData);
					logger.info(
						`Successfully generated image with Gemini (${buffer.length} bytes)`,
					);
					return buffer;
				}
			}

			throw new Error("No image data found in Gemini response");
		} catch (error) {
			logger.error("Error generating image with Gemini:", error);
			throw error;
		}
	}
}
