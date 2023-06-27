import {meme, yt} from './commands';
import {Client, Events, GatewayIntentBits, REST, Routes} from 'discord.js';
import dotenv from 'dotenv';

import {readFiles} from './util';
import {getVariables} from './getVariables';
import {logger} from './logger';
import {ai} from './ai';

dotenv.config();
export const sounds: Array<string> = [];

const {appId, token} = getVariables();
const commands = [meme, yt];

readFiles('../sounds', (files) => files.forEach((file) => sounds.push(file)));

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.login(token);

client.on(Events.MessageCreate, async (message) => {
	if (message.author.bot) return;
	const mentionsBot = message.mentions.members?.find((m) => m.id === client.application?.id);
	if (mentionsBot) {
		await ai(message, mentionsBot?.id);
	}
});

client.once(Events.ClientReady, async (c) => {
	logger.info(`Ready! Logged in as ${c.user.tag}`);
	const guildIds = client.guilds.cache.map((guild) => guild.id);

	for (const guildId of guildIds) {
		const commandList = commands.map((c) => c.id).join(', ');
		logger.info(`registering ${commandList} run guild ${guildId}`);
		const rest = new REST({version: '10'}).setToken(token);
		await rest.put(Routes.applicationGuildCommands(appId, guildId), {
			body: commands.map((c) => c.register),
		});
	}
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	await interaction.deferReply();
	const command = commands.find((c) => c.id === interaction.commandName);

	if (!command) {
		await interaction.editReply(`That command does not exist.`);
		return;
	}

	try {
		await command.run(interaction);
	} catch (err) {
		logger.error(err);
		await interaction.editReply(`I may or may not have shat myself.`);
	}
});
