import { generateDependencyReport } from "@discordjs/voice";
import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import { ai } from "./ai";
import { ask, img, meme } from "./commands";
import { validateStartupConfig } from "./config";
import { getVariables } from "./getVariables";
import { logger } from "./logger";
import {
	ALLOWED_MENTIONS,
	aiRequestLimiter,
	RequestRejectedError,
} from "./security";
import { readFiles } from "./util";

dotenv.config();
validateStartupConfig();
export const sounds: Array<string> = [];

const { appId, token } = getVariables();
const commands = [meme, ask, img];

readFiles("../sounds", (files) => files.forEach((file) => sounds.push(file)));

logger.info(generateDependencyReport());

const client = new Client({
	allowedMentions: ALLOWED_MENTIONS,
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.on(Events.Error, (error) => logger.error(error));
client.login(token).catch((error) => {
	logger.error(error);
	process.exitCode = 1;
});

client.on(Events.MessageCreate, async (message) => {
	if (message.author.bot || !message.inGuild()) return;
	const mentionsBot = message.mentions.members?.find(
		(m) => m.id === client.application?.id,
	);
	if (mentionsBot) {
		let release: (() => void) | undefined;
		try {
			release = aiRequestLimiter.acquire({
				userId: message.author.id,
				guildId: message.guildId,
			});
			await ai({ message, botId: mentionsBot.id });
		} catch (error) {
			if (!(error instanceof RequestRejectedError)) logger.error(error);
			await message
				.reply({
					content:
						error instanceof RequestRejectedError
							? error.message
							: "Unable to process this request.",
				})
				.catch((replyError) => logger.error(replyError));
		} finally {
			release?.();
		}
	}
});

client.once(Events.ClientReady, async (c) => {
	logger.info(`Ready! Logged in as ${c.user.tag}`);
	const guildIds = client.guilds.cache.map((guild) => guild.id);

	for (const guildId of guildIds) {
		const commandList = commands.map((c) => c.id).join(", ");
		logger.info(`registering ${commandList} run guild ${guildId}`);
		const rest = new REST({ version: "10" }).setToken(token);
		await rest.put(Routes.applicationGuildCommands(appId, guildId), {
			body: commands.map((c) => c.register),
		});
	}
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = commands.find((c) => c.id === interaction.commandName);
	if (!command || !interaction.inGuild()) return;

	let release: (() => void) | undefined;
	try {
		await interaction.deferReply();
		if (command.id === ask.id || command.id === img.id) {
			release = aiRequestLimiter.acquire({
				userId: interaction.user.id,
				guildId: interaction.guildId,
			});
		}
		await command.run(interaction);
	} catch (err) {
		if (!(err instanceof RequestRejectedError)) logger.error(err);
		if (interaction.deferred || interaction.replied) {
			await interaction
				.editReply(
					err instanceof RequestRejectedError
						? err.message
						: "I may or may not have shat myself.",
				)
				.catch((replyError) => logger.error(replyError));
		}
	} finally {
		release?.();
	}
});
