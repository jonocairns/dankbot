import OpenAI from 'openai';
import {ImageService} from './image-service';
import {logger} from '../logger';
import {SafetyViolationError, ImageGenerationError} from './image-errors';

export class OpenAIImageService implements ImageService {
	private client: OpenAI;
	private model: string;

	constructor() {
		if (!process.env.OPENAI_API_KEY) {
			throw new Error('OPENAI_API_KEY environment variable is required for OpenAI image generation');
		}

		this.client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
		this.model = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1-mini';
		logger.info(`Initialized OpenAI image service with model: ${this.model}`);
	}

	async generateImage(prompt: string, inputImageUrls?: Array<string>): Promise<Buffer> {
		logger.info(`Generating image with OpenAI model ${this.model}`);

		try {
			if (inputImageUrls && inputImageUrls.length > 0) {
				return await this.editImageWithInputs(prompt, inputImageUrls);
			}

			return await this.generateImageFromText(prompt);
		} catch (error) {
			const parsedError = this.parseOpenAIError(error);
			logger.error('Error generating image with OpenAI:', parsedError);
			throw parsedError;
		}
	}

	private async editImageWithInputs(prompt: string, inputImageUrls: Array<string>): Promise<Buffer> {
		logger.info(`Processing ${inputImageUrls.length} input image(s) with prompt using images.edit()`);

		const imageFiles = await this.fetchImageFiles(inputImageUrls);

		if (imageFiles.length === 0) {
			throw new Error('Failed to fetch any input images');
		}

		const response = await this.client.images.edit({
			model: this.model,
			image: imageFiles,
			prompt: prompt,
			n: 1,
		});

		return await this.extractImageBuffer(response);
	}

	private async generateImageFromText(prompt: string): Promise<Buffer> {
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

		return await this.extractImageBuffer(response);
	}

	private async fetchImageFiles(imageUrls: Array<string>): Promise<Array<File>> {
		const imageFiles: Array<File> = [];

		for (const imageUrl of imageUrls) {
			try {
				const imageResponse = await fetch(imageUrl);
				const imageBuffer = await imageResponse.arrayBuffer();
				const contentType = imageResponse.headers.get('content-type') || 'image/png';
				const filename = imageUrl.split('/').pop() || 'image.png';

				const file = new File([imageBuffer], filename, {type: contentType});
				imageFiles.push(file);
				logger.info(`Fetched image: ${filename} (${imageBuffer.byteLength} bytes, ${contentType})`);
			} catch (error) {
				logger.error(`Error fetching image from ${imageUrl}:`, error);
			}
		}

		return imageFiles;
	}

	private async extractImageBuffer(response: OpenAI.Images.ImagesResponse): Promise<Buffer> {
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
	}

	private parseOpenAIError(error: unknown): Error {
		if (error && typeof error === 'object' && 'message' in error) {
			const errorMessage = String((error as {message: string}).message || '');

			const safetyViolationMatch = errorMessage.match(/safety_violations=\[([^\]]+)\]/);
			const requestIdMatch = errorMessage.match(/request ID ([a-z0-9_]+)/);

			if (safetyViolationMatch) {
				const violations = safetyViolationMatch[1].split(',').map((v) => v.trim());
				const requestId = requestIdMatch?.[1];

				return new SafetyViolationError(
					`Request rejected by OpenAI safety system. Violations: ${violations.join(', ')}`,
					violations,
					requestId,
					error
				);
			}

			if (errorMessage.includes('rejected by the safety system')) {
				return new SafetyViolationError(
					'Request rejected by OpenAI safety system',
					['unspecified'],
					requestIdMatch?.[1],
					error
				);
			}
		}

		if (error instanceof Error) {
			return new ImageGenerationError(error.message, error);
		}

		return new ImageGenerationError('Unknown error occurred during image generation', error);
	}
}
