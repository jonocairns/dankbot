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

	async generateImage(prompt: string, inputImageUrls?: Array<string>): Promise<Buffer> {
		logger.info(`Generating image with Gemini model ${this.model}`);

		try {
			// Build contents array with text and images if provided
			let contents: string | Array<{text?: string; inlineData?: {mimeType: string; data: string}}>;

			if (inputImageUrls && inputImageUrls.length > 0) {
				logger.info(`Processing ${inputImageUrls.length} input image(s) with prompt`);

				const parts: Array<{text?: string; inlineData?: {mimeType: string; data: string}}> = [{text: prompt}];

				// Fetch and convert images to base64
				for (const imageUrl of inputImageUrls) {
					try {
						const imageResponse = await fetch(imageUrl);
						const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
						const base64Image = imageBuffer.toString('base64');

						// Determine MIME type from URL or default to image/png
						let mimeType = 'image/png';
						if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) {
							mimeType = 'image/jpeg';
						} else if (imageUrl.includes('.gif')) {
							mimeType = 'image/gif';
						} else if (imageUrl.includes('.webp')) {
							mimeType = 'image/webp';
						}

						parts.push({
							inlineData: {
								mimeType,
								data: base64Image,
							},
						});

						logger.info(`Added image to request (${imageBuffer.length} bytes, ${mimeType})`);
					} catch (error) {
						logger.error(`Error fetching image from ${imageUrl}:`, error);
					}
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
