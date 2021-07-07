import Discord from 'discord.js';
import dotenv from 'dotenv';
import winston from 'winston';

import {message} from './message';
import {ready} from './ready';
import {readFiles} from './util';
import {some, sample} from 'lodash';
import path from 'path';

dotenv.config();
export const client = new Discord.Client();
export const prefix = '.';
export const sounds: Array<string> = [];

export const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  format: winston.format.printf(
    log => `[${log.level.toUpperCase()}] - ${log.message}`
  ),
});

readFiles('../sounds', files => files.forEach(file => sounds.push(file)));

let hotChannel: Discord.VoiceChannel;
const delay = () => {
  const tenMins = 6000;
  const timeout = Math.random() * tenMins + 5000;
  console.log(`timer set ${timeout}`);
  setTimeout(async () => {
    const connection = await hotChannel.join();
    const random = sample(sounds) || '';
    const arg = random.split('.').shift();
    const file = sounds.find(
      s => arg && s.split('.').shift() === arg.toLowerCase()
    );

    if (file) {
      const dispatcher = connection.play(
        path.join(__dirname, `../sounds/${file}`)
      );

      dispatcher.on('error', e => {
        logger.error(e);
        connection.disconnect();
      });
      dispatcher.on('end', () => {
        delay();
      });
    }
  }, timeout);
};

client.on('voiceStateUpdate', async voiceState => {
  if (
    voiceState.member &&
    voiceState.member.voice.channel &&
    some(voiceState.member.voice.channel.members.array())
  ) {
    hotChannel = voiceState.member.voice.channel;
    delay();
  }
});
client.on('ready', ready);
client.on('message', message);
client.on('debug', m => logger.debug(m));
client.on('warn', m => logger.warn(m));
client.on('error', m => logger.error(m.message));
process.on('uncaughtException', error => logger.error(error.message));

client.login(process.env.DISCORD_BOT_TOKEN);
