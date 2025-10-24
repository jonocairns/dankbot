import { createAudioResource, StreamType } from "@discordjs/voice";
import {
	CacheType,
	ChatInputCommandInteraction,
	GuildMember,
	SlashCommandBuilder,
} from "discord.js";
import { Innertube } from "youtubei.js";
import { cleanUp } from "../cleanUp";
import { getPlayer, UNABLE_TO_CONNECT_ERROR } from "../getPlayer";
import { logger } from "../logger";
import { Command, CommandName } from "../util";

function extractVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
		/^([a-zA-Z0-9_-]{11})$/,
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) {
			return match[1];
		}
	}
	return null;
}

export const yt: Command = {
	id: CommandName.yt,
	register: new SlashCommandBuilder()
		.setName(CommandName.yt)
		.setDescription("Plays a YouTube link")
		.addStringOption((option) =>
			option
				.setName("link")
				.setDescription("The YouTube link")
				.setRequired(true),
		),
	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const { player } = getPlayer(interaction);
		const url = interaction.options.get("link")?.value as string;
		const canJoin = (interaction.member as GuildMember)?.voice?.channel?.id;

		if (!canJoin) {
			await interaction.editReply(UNABLE_TO_CONNECT_ERROR);
			return;
		}

		if (!url) {
			await interaction.editReply({ content: "No link provided. Idiot" });
			return;
		}

		const videoId = extractVideoId(url);
		if (!videoId) {
			await interaction.editReply({ content: "Invalid YouTube URL. Idiot" });
			return;
		}

		try {
			logger.info(`Fetching video info for ${videoId}...`);
			const youtube = await Innertube.create();

			logger.info(`Downloading audio stream...`);
			const stream = await youtube.download(videoId, {
				type: "audio",
				quality: "best",
			});

			await interaction.editReply({ content: `playing ${url}` });

			const resource = createAudioResource(stream, {
				inputType: StreamType.Arbitrary,
			});

			resource.playStream.on("error", (error: Error) => {
				logger.error(`Stream error: ${error.message}`);
			});

			player.play(resource);
			await cleanUp(interaction);
		} catch (error) {
			logger.error(`Failed to play YouTube video: ${error}`);
			await interaction.editReply({
				content: "Failed to play video. YouTube might be blocking requests.",
			});
		}
	},
};
