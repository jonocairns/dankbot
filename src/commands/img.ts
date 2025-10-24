import {
	CacheType,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { getImageService, SafetyViolationError } from "../image";
import { logger } from "../logger";
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

		logger.info(`Generating image with prompt: ${prompt}`);

		const inputImageUrls: Array<string> = [];
		if (attachment) {
			logger.info(
				`Attachment found: ${attachment.name} (${attachment.contentType})`,
			);
			if (attachment.contentType?.startsWith("image/")) {
				inputImageUrls.push(attachment.url);
				logger.info(`Added attachment URL: ${attachment.url}`);
			} else {
				logger.warn(`Attachment is not an image: ${attachment.contentType}`);
			}
		}

		try {
			const imageService = getImageService();
			const imageBuffer = await imageService.generateImage(
				prompt,
				inputImageUrls.length > 0 ? inputImageUrls : undefined,
			);

			await interaction.editReply({
				content: `Generated image for: "${prompt}"`,
				files: [
					{
						attachment: imageBuffer,
						name: "generated-image.png",
					},
				],
			});

			logger.info("Image sent successfully");
		} catch (error) {
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
