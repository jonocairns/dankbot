import { createAudioResource } from "@discordjs/voice";
import {
	CacheType,
	ChatInputCommandInteraction,
	GuildMember,
	SlashCommandBuilder,
} from "discord.js";
import OpenAI from "openai";
import { Readable } from "stream";
import { AI_MODEL } from "../ai";
import { getPlayer, UNABLE_TO_CONNECT_ERROR } from "../getPlayer";
import { logger } from "../logger";
import { getTTSService } from "../tts";
import { Command, CommandName } from "../util";
import { voices } from "../voices";

const OPTIONS = {
	ask: {
		name: "ask",
		description: "The thing to ask",
	},
};

const TTS_VOICE = "onyx" as const;

export const ask: Command = {
	id: CommandName.ask,
	register: new SlashCommandBuilder()
		.setName(CommandName.ask)
		.setDescription("Ask me anything")
		.addStringOption((option) =>
			option
				.setName(OPTIONS.ask.name)
				.setDescription(OPTIONS.ask.description)
				.setRequired(true),
		),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const content = interaction.options.get(OPTIONS.ask.name)?.value as string;
		const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
		const canJoin = (interaction.member as GuildMember)?.voice?.channel?.id;

		if (!canJoin) {
			await interaction.editReply(UNABLE_TO_CONNECT_ERROR);
			return;
		}

		const completion = await openai.chat.completions.create({
			model: AI_MODEL,
			messages: [voices[0].system, { role: "user", content }],
		});

		const text = completion.choices[0].message?.content;
		logger.info(`response: ${text}`);

		if (!text) {
			await interaction.editReply("Sorry, I could not generate a response.");
			return;
		}

		logger.info(`Getting TTS service...`);
		const ttsService = getTTSService();
		logger.info(`Calling generateSpeech with text length: ${text.length}`);
		const buffer = await ttsService.generateSpeech(text, TTS_VOICE);
		logger.info(`Received buffer of size: ${buffer.length} bytes`);

		logger.info(`creating readable stream...`);
		const stream = Readable.from(buffer);

		const { player } = getPlayer(interaction);
		const resource = createAudioResource(stream);

		resource.playStream.on("error", (error: Error) => {
			logger.error(error.message);
		});

		logger.info(`attempting to play...`);
		player.play(resource);

		await interaction.editReply(text);
		logger.info(`complete`);
	},
};
