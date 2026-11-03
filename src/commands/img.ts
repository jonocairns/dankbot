import {
	CacheType,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { getImageService, SafetyViolationError } from "../image";
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "../image/download-image";
import { logger } from "../logger";
import {
	MAX_PROMPT_LENGTH,
	RequestRejectedError,
	validatePrompt,
} from "../security";
import { Command, CommandName } from "../util";

const OPTIONS = {
	prompt: {
		name: "prompt",
		description: "Description of the image to generate",
	},
	image: {
		name: "image",
		description: "Optional image to provide context for generation",
	},
};

export const img: Command = {
	id: CommandName.img,
	register: new SlashCommandBuilder()
		.setName(CommandName.img)
		.setDescription("Generate an image using AI")
		.addStringOption((option) =>
			option
				.setName(OPTIONS.prompt.name)
				.setDescription(OPTIONS.prompt.description)
				.setMaxLength(MAX_PROMPT_LENGTH)
				.setRequired(true),
		)
		.addAttachmentOption((option) =>
			option
				.setName(OPTIONS.image.name)
				.setDescription(OPTIONS.image.description)
				.setRequired(false),
		),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const prompt = interaction.options.get(OPTIONS.prompt.name)
			?.value as string;
		const attachment = interaction.options.getAttachment(OPTIONS.image.name);
		validatePrompt(prompt);

		const inputImageUrls: Array<string> = [];
		if (attachment) {
			if (
				!IMAGE_MIME_TYPES.has(attachment.contentType ?? "") ||
				attachment.size > MAX_IMAGE_BYTES
			) {
				throw new RequestRejectedError(
					"Please attach a PNG, JPEG, WebP or GIF image of 10 MiB or smaller.",
				);
			}
			inputImageUrls.push(attachment.url);
		}

		try {
			const imageService = getImageService();
			const imageBuffer = await imageService.generateImage(
				prompt,
				inputImageUrls.length > 0 ? inputImageUrls : undefined,
			);

			await interaction.editReply({
				content: `Generated image for: "${prompt}"`.slice(0, 2000),
				files: [
					{
						attachment: imageBuffer,
						name: "generated-image.png",
					},
				],
			});

			logger.info("Image sent successfully");
		} catch (error) {
			if (error instanceof RequestRejectedError) throw error;
			logger.error("Error generating image:", error);

			const isSafetyError =
				error instanceof SafetyViolationError ||
				(error &&
					typeof error === "object" &&
					"name" in error &&
					error.name === "SafetyViolationError");

			if (isSafetyError) {
				const safetyError = error as SafetyViolationError;
				const violationsList = safetyError.violations.join(", ");
				const message = `Image generation was blocked by the safety system due to: ${violationsList}.`;

				await interaction.editReply(message);
			} else {
				await interaction.editReply(
					"An error occurred while generating the image.",
				);
			}
		}
	},
};
