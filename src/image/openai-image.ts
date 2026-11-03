import OpenAI from "openai";
import { logger } from "../logger";
import {
	AI_TIMEOUT_MS,
	RequestRejectedError,
	validatePrompt,
} from "../security";
import { decodeGeneratedImage, downloadDiscordImage } from "./download-image";
import { ImageGenerationError, SafetyViolationError } from "./image-errors";
import { ImageService } from "./image-service";

export class OpenAIImageService implements ImageService {
	private client: OpenAI;
	private model: string;

	constructor() {
		if (!process.env.OPENAI_API_KEY) {
			throw new Error(
				"OPENAI_API_KEY environment variable is required for OpenAI image generation",
			);
		}

		this.client = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
			timeout: AI_TIMEOUT_MS,
			maxRetries: 0,
		});
		this.model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1-mini";
		logger.info(`Initialized OpenAI image service with model: ${this.model}`);
	}

	async generateImage(
		prompt: string,
		inputImageUrls?: Array<string>,
	): Promise<Buffer> {
		validatePrompt(prompt);
		if (inputImageUrls && inputImageUrls.length > 1)
			throw new RequestRejectedError("Please attach only one image.");
		logger.info(`Generating image with OpenAI model ${this.model}`);

		try {
			if (inputImageUrls && inputImageUrls.length > 0) {
				return await this.editImageWithInputs(prompt, inputImageUrls);
			}

			return await this.generateImageFromText(prompt);
		} catch (error) {
			if (error instanceof RequestRejectedError) throw error;
			const parsedError = this.parseOpenAIError(error);
			logger.error("Error generating image with OpenAI:", parsedError);
			throw parsedError;
		}
	}

	private async editImageWithInputs(
		prompt: string,
		inputImageUrls: Array<string>,
	): Promise<Buffer> {
		logger.info(
			`Processing ${inputImageUrls.length} input image(s) with prompt using images.edit()`,
		);

		const imageFiles = await this.fetchImageFiles(inputImageUrls);

		if (imageFiles.length === 0) {
			throw new Error("Failed to fetch any input images");
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
		const isDalleModel = this.model.startsWith("dall-e");

		const requestParams: OpenAI.Images.ImageGenerateParamsNonStreaming = {
			model: this.model,
			prompt: prompt,
			n: 1,
		};

		if (isDalleModel) {
			requestParams.response_format = "b64_json";
		}

		const response = await this.client.images.generate(requestParams);

		return await this.extractImageBuffer(response);
	}

	private async fetchImageFiles(
		imageUrls: Array<string>,
	): Promise<Array<File>> {
		const imageFiles: Array<File> = [];

		for (const imageUrl of imageUrls) {
			const { buffer, mimeType } = await downloadDiscordImage(imageUrl);
			imageFiles.push(
				new File([new Uint8Array(buffer)], `image.${mimeType.split("/")[1]}`, {
					type: mimeType,
				}),
			);
		}

		return imageFiles;
	}

	private async extractImageBuffer(
		response: OpenAI.Images.ImagesResponse,
	): Promise<Buffer> {
		const imageData = response.data?.[0];

		if (!imageData) {
			throw new Error("No image data returned from OpenAI API");
		}

		if (imageData.b64_json) {
			return decodeGeneratedImage(imageData.b64_json);
		}

		throw new Error("No base64 image data returned from OpenAI API");
	}

	private parseOpenAIError(error: unknown): Error {
		if (error && typeof error === "object" && "message" in error) {
			const errorMessage = String((error as { message: string }).message || "");

			const safetyViolationMatch = errorMessage.match(
				/safety_violations=\[([^\]]+)\]/,
			);
			const requestIdMatch = errorMessage.match(/request ID ([a-z0-9_]+)/);

			if (safetyViolationMatch) {
				const violations = safetyViolationMatch[1]
					.split(",")
					.map((v) => v.trim());
				const requestId = requestIdMatch?.[1];

				return new SafetyViolationError(
					`Request rejected by OpenAI safety system. Violations: ${violations.join(", ")}`,
					violations,
					requestId,
					error,
				);
			}

			if (errorMessage.includes("rejected by the safety system")) {
				return new SafetyViolationError(
					"Request rejected by OpenAI safety system",
					["unspecified"],
					requestIdMatch?.[1],
					error,
				);
			}
		}

		if (error instanceof Error) {
			return new ImageGenerationError(error.message, error);
		}

		return new ImageGenerationError(
			"Unknown error occurred during image generation",
			error,
		);
	}
}
