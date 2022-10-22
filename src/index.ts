import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice';
import { Client, Events, GatewayIntentBits, GuildMember, REST, Routes, SlashCommandBuilder, } from 'discord.js';
import dotenv from 'dotenv';
import { createReadStream } from 'fs';
import winston from 'winston';
import ytdl from 'ytdl-core';

import { readFiles } from './util';

dotenv.config();
export const prefix = '.';
export const sounds: Array<string> = [];
const token = process.env.DISCORD_BOT_TOKEN ?? '';
const appId = process.env.APPLICATION_ID ?? '';

if (!token) {
  throw new Error('DISCORD_BOT_TOKEN not defined in .env');
}

if (!appId) {
  throw new Error('APPLICATION_ID not defined in .env');
}

export const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  format: winston.format.printf(
    log => `[${log.level.toUpperCase()}] - ${log.message}`
  ),
});
readFiles('../sounds', files => files.forEach(file => sounds.push(file)));
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once(Events.ClientReady, async c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  const guildIds = client.guilds.cache.map(guild => guild.id);
  init(guildIds);
});

client.login(token);
const rest = new REST({ version: '10' }).setToken(token);

enum Commands {
  meme = 'meme',
  yt = 'yt'
}

const init = async (guilds: string[]) => {

  for (const guildId of guilds) {

    await rest.put(Routes.applicationGuildCommands(appId, guildId), {
      body: [
        new SlashCommandBuilder()
          .setName(Commands.meme)
          .setDescription('Plays a dank meme')
          .addStringOption(option => option.setName('meme').setDescription('A specific meme')),
        new SlashCommandBuilder()
          .setName(Commands.yt)
          .setDescription('Plays a YouTube link')
          .addStringOption(option => option.setName('link').setDescription('The YouTube link').setRequired(true))
      ]
    })
  }

};

const player = createAudioPlayer();

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const voiceChannel = (interaction.member as GuildMember)?.voice?.channel?.id;

    if (!voiceChannel) {
      interaction.reply({ content: 'You are not in a voice channel dummy' });
      return;
    }

    if (!interaction.guildId || !interaction.guild?.voiceAdapterCreator) {
      interaction.reply({ content: 'I cannot play sounds due to reasons above what your simple mind can handle' });
      return;
    }

    const connection = joinVoiceChannel({
      channelId: voiceChannel,
      guildId: interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });
    connection.subscribe(player);

    if (interaction.commandName === Commands.meme) {

      const input = interaction.options.get('meme')?.value as string;
      let sound = sounds[Math.floor(Math.random() * sounds.length)];
      if (input) {
        const inputSound = sounds.find(s => s.split('.')[0] === input);
        if (inputSound) {
          sound = inputSound;
        } else {
          interaction.reply({ content: `You dummy McIdiot, '${input}' doesn't exist` });
          return;
        }
      }
      const stream = createReadStream(`./sounds/${sound}`);
      const resource = createAudioResource(stream);
      player.play(resource);
      interaction.reply({ content: `Playing '${sound.split('.')[0]}' good sir` });
    } else if (interaction.commandName === Commands.yt) {
      const url = interaction.options.get('link')?.value as string;

      if (!url) {
        interaction.reply({ content: 'No link provided. Idiot' });
        return;
      }

      const stream = ytdl(url, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
      });

      const resource = createAudioResource(stream);
      player.play(resource);

      interaction.reply({ content: `playing ${url}` });
    }
    setTimeout(async () => {
      await interaction.deleteReply();
    }, 3000);
  }
});
