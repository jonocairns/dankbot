import {meme, yt, doj, ai} from './commands';
import {Client, Events, GatewayIntentBits, REST, Routes} from 'discord.js';
import dotenv from 'dotenv';

import {CommandName, readFiles} from './util';
import {getVariables} from './getVariables';
import {logger} from './logger';
import {cleanUp} from './cleanUp';

dotenv.config();
export const sounds: Array<string> = [];

const {appId, token} = getVariables();
const commands = [meme, yt, doj, ai];

readFiles('../sounds', (files) => files.forEach((file) => sounds.push(file)));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.login(token);

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
    } finally {
        const needsCleanUp = ![CommandName.ai].includes(command.id);
        if (needsCleanUp) {
            await cleanUp(interaction);
        }
    }
});
