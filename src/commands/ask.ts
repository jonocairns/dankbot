import {
	CacheType,
	ChatInputCommandInteraction,
	GuildMember,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import OpenAI from "openai";
import { Readable } from "stream";
import { getAIModel } from "../config";
import { playAudio, UNABLE_TO_CONNECT_ERROR } from "../getPlayer";
import { logger } from "../logger";
import {
	AI_TIMEOUT_MS,
	MAX_COMPLETION_TOKENS,
	MAX_PROMPT_LENGTH,
	validatePrompt,
} from "../security";
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
const AUDIO_ERROR = "I couldn't play the audio for this answer.";

export const ask: Command = {
	id: CommandName.ask,
	register: new SlashCommandBuilder()
		.setName(CommandName.ask)
		.setDescription("Ask me anything")
		.addStringOption((option) =>
			option
				.setName(OPTIONS.ask.name)
				.setDescription(OPTIONS.ask.description)
				.setMaxLength(MAX_PROMPT_LENGTH)
				.setRequired(true),
		),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const content = interaction.options.get(OPTIONS.ask.name)?.value as string;
		validatePrompt(content);
		const canJoin = (interaction.member as GuildMember)?.voice?.channel?.id;

		if (!canJoin) {
			await interaction.editReply(UNABLE_TO_CONNECT_ERROR);
			return;
		}

		const openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
			timeout: AI_TIMEOUT_MS,
			maxRetries: 0,
		});

		// One deadline covers generation, speech download and playback startup.
		// Aborting cancels the underlying requests, so the caller's limiter slot
		// is only released once that work has settled.
		const controller = new AbortController();
		const deadline = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
		try {
			const completion = await openai.chat.completions.create(
				{
					model: getAIModel(),
					max_completion_tokens: MAX_COMPLETION_TOKENS,
					messages: [voices[0].system, { role: "user", content }],
				},
				{ signal: controller.signal },
			);

			const text = completion.choices[0]?.message?.content?.slice(0, 2000);

			if (!text) {
				await interaction.editReply("Sorry, I could not generate a response.");
				return;
			}

			// Deliver the answer before speech so audio failures cannot lose it.
			await interaction.editReply(text);

			try {
				const buffer = await getTTSService().generateSpeech(
					text,
					TTS_VOICE,
					controller.signal,
				);
				logger.info(`Received speech buffer of size: ${buffer.length} bytes`);
				await playAudio(interaction, Readable.from(buffer), controller.signal);
			} catch (error) {
				logger.error(error);
				await interaction
					.followUp({
						content: AUDIO_ERROR,
						flags: MessageFlags.Ephemeral,
					})
					.catch((replyError) => logger.error(replyError));
			}
		} finally {
			clearTimeout(deadline);
		}
	},
};
