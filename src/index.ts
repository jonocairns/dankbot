import Discord from 'discord.js';
import dotenv from 'dotenv';
import winston from 'winston';

import {message} from './message';
import {ready} from './ready';
import {readFiles} from './util';

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

client.on('ready', ready);
client.on('message', message);
client.on('debug', m => logger.debug(m));
client.on('warn', m => logger.warn(m));
client.on('error', m => logger.error(m.message));
process.on('uncaughtException', error => logger.error(error.message));

client.login(process.env.DISCORD_BOT_TOKEN);
