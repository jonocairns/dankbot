import {meme, yt} from './commands';
import {Client, Events, GatewayIntentBits, REST, Routes} from 'discord.js';
import dotenv from 'dotenv';

import {readFiles} from './util';
import {getVariables} from './getVariables';
import {logger} from './logger';
import {generateDependencyReport} from '@discordjs/voice';

dotenv.config();
export const prefix = '.';
export const sounds: Array<string> = [];

const {appId, token} = getVariables();
const commands = [meme, yt];

readFiles('../sounds', (files) => files.forEach((file) => sounds.push(file)));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.login(token);

client.once(Events.ClientReady, async (c) => {
    logger.info(`Ready! Logged in as ${c.user.tag}`);
    const guildIds = client.guilds.cache.map((guild) => guild.id);
    for (const guildId of guildIds) {
        logger.info(
            `registering ${commands
                .map((c) => c.id)
                .join(', ')} run guild ${guildId}`
        );
        const rest = new REST({version: '10'}).setToken(token);
        await rest.put(Routes.applicationGuildCommands(appId, guildId), {
            body: commands.map((c) => c.register),
        });
    }

    logger.debug(generateDependencyReport());
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply();
    const command = commands.find((c) => c.id === interaction.commandName);

    if (!command) {
        logger.info(`${interaction.commandName} triggered with no handler`);
        await interaction.reply(`That command does not exist.`);
        return;
    }

    try {
        logger.info(`running ${command?.id}`);
        await command.run(interaction);
    } catch (err) {
        logger.error(err);
    }
});
