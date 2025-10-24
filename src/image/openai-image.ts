import OpenAI from 'openai';
import {ImageService} from './image-service';
import {logger} from '../logger';

export class OpenAIImageService implements ImageService {
	private client: OpenAI;
	private model: string;

	constructor() {
		if (!process.env.OPENAI_API_KEY) {
			throw new Error('OPENAI_API_KEY environment variable is required for OpenAI image generation');
		}

		this.client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
		this.model = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';
		logger.info(`Initialized OpenAI image service with model: ${this.model}`);
	}

	async generateImage(prompt: string): Promise<Buffer> {
		logger.info(`Generating image with OpenAI model ${this.model}`);

		try {
			const isDalleModel = this.model.startsWith('dall-e');

			const requestParams: OpenAI.Images.ImageGenerateParamsNonStreaming = {
				model: this.model,
				prompt: prompt,
				n: 1,
			};

			if (isDalleModel) {
				requestParams.response_format = 'url';
			}
			const response = await this.client.images.generate(requestParams);

			const imageData = response.data?.[0];

			if (!imageData) {
				throw new Error('No image data returned from OpenAI API');
			}

			if (imageData.b64_json) {
				logger.info('Image generated successfully (base64 format)');
				const buffer = Buffer.from(imageData.b64_json, 'base64');
				logger.info(`Successfully processed base64 image from OpenAI (${buffer.length} bytes)`);
				return buffer;
			}

			if (imageData.url) {
				logger.info(`Image generated successfully (URL format): ${imageData.url}`);
				const imageResponse = await fetch(imageData.url);
				const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
				logger.info(`Successfully fetched image from OpenAI (${imageBuffer.length} bytes)`);
				return imageBuffer;
			}

			throw new Error('No image URL or base64 data returned from OpenAI API');
		} catch (error) {
			logger.error('Error generating image with OpenAI:', error);
			throw error;
		}
	}
}
