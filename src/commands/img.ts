import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder} from 'discord.js';
import {Command, CommandName} from '../util';
import OpenAI from 'openai';
import {logger} from '../logger';

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
		.setDescription('Generate an image using openai')
		.addStringOption((option) =>
			option.setName(OPTIONS.prompt.name).setDescription(OPTIONS.prompt.description).setRequired(true)
		),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const prompt = interaction.options.get(OPTIONS.prompt.name)?.value as string;
		const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});

		logger.info(`Generating image with prompt: ${prompt}`);

		try {
			const response = await openai.images.generate({
				model: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1',
				prompt: prompt,
				n: 1,
			});

			const imageUrl = response.data?.[0]?.url;

			if (!imageUrl) {
				await interaction.editReply('Sorry, I could not generate an image.');
				return;
			}

			logger.info(`Image generated successfully: ${imageUrl}`);

			const imageResponse = await fetch(imageUrl);
			const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

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
