import {GoogleGenAI} from '@google/genai';
import {ImageService} from './image-service';
import {logger} from '../logger';

export class GeminiImageService implements ImageService {
	private client: GoogleGenAI;
	private model: string;

	constructor() {
		if (!process.env.GOOGLE_API_KEY) {
			throw new Error('GOOGLE_API_KEY environment variable is required for Gemini image generation');
		}

		this.client = new GoogleGenAI({});
		this.model = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image';
		logger.info(`Initialized Gemini image service with model: ${this.model}`);
	}

	async generateImage(prompt: string): Promise<Buffer> {
		logger.info(`Generating image with Gemini model ${this.model}`);

		try {
			const response = await this.client.models.generateContent({
				model: this.model,
				contents: prompt,
			});

			if (!response.candidates || response.candidates.length === 0) {
				throw new Error('No candidates returned from Gemini API');
			}

			const candidate = response.candidates[0];
			if (!candidate.content || !candidate.content.parts) {
				throw new Error('No content parts in Gemini response');
			}

			const parts = candidate.content.parts;

			for (const part of parts) {
				if (part.inlineData && part.inlineData.data) {
					const imageData = part.inlineData.data;
					const buffer = Buffer.from(imageData, 'base64');
					logger.info(`Successfully generated image with Gemini (${buffer.length} bytes)`);
					return buffer;
				}
			}

			throw new Error('No image data found in Gemini response');
		} catch (error) {
			logger.error('Error generating image with Gemini:', error);
			throw error;
		}
	}
}
