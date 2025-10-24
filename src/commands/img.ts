import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {Command, CommandName} from '../util';
import {logger} from '../logger';
import {getImageService} from '../image';

const OPTIONS = {
	prompt: {
		name: 'prompt',
		description: 'Description of the image to generate',
	},
};

export const img: Command = {
	id: CommandName.img,
	register: new SlashCommandBuilder()
		.setName(CommandName.img)
		.setDescription('Generate an image using AI')
		.addStringOption((option) =>
			option.setName(OPTIONS.prompt.name).setDescription(OPTIONS.prompt.description).setRequired(true)
		),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const prompt = interaction.options.get(OPTIONS.prompt.name)?.value as string;

		logger.info(`Generating image with prompt: ${prompt}`);

		try {
			const imageService = getImageService();
			const imageBuffer = await imageService.generateImage(prompt);

			await interaction.editReply({
				content: `Generated image for: "${prompt}"`,
				files: [
					{
						attachment: imageBuffer,
						name: 'generated-image.png',
					},
				],
			});

			logger.info('Image sent successfully');
		} catch (error) {
			logger.error('Error generating image:', error);
			await interaction.editReply('An error occurred while generating the image.');
		}
	},
};
