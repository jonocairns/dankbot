import Discord from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import {some} from 'lodash';
import path from 'path';
import winston from 'winston';

dotenv.config();
const client = new Discord.Client();
export const prefix = '.';
export const sounds: Array<string> = [];
export let timer: NodeJS.Timeout;
export const setTimer = (t: NodeJS.Timeout) => {
  timer = t;
};
export const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  format: winston.format.printf(
    log => `[${log.level.toUpperCase()}] - ${log.message}`
  ),
});

fs.readdir(path.join(__dirname, '../sounds'), (err, files) => {
  if (err) {
    logger.error('Unable to scan directory: ' + err);
    return;
  }
  logger.debug(`loading files...`);
  files.forEach(file => sounds.push(file));
  logger.debug(`loaded ${files.length} files.`);
});

const fetchStatus = async () => {
  const guilds = await Promise.all(
    client.guilds.map(async g => g.fetchMembers())
  );

  const people = guilds.reduce(
    (acc, curr) => acc + curr.members.array().length,
    0
  );

  return `Serving ${guilds.length} guilds and ${people} people.`;
};

export interface Handler {
  cmd: Array<string>;
  action(msg: Discord.Message): Promise<Discord.Message>;
}

const commands: Array<Handler> = [];

client.on('ready', async () => {
  const status = await fetchStatus();
  client.user.setActivity('you from a distance', {type: 'WATCHING'});

  logger.info(`initialising handlers...`);
  fs.readdir(path.join(__dirname, './handlers'), (err, files) =>
    files.forEach(async file => {
      const handler = await import(`./handlers/${file.split('.')[0]}`);
      commands.push(handler.default);
    })
  );

  logger.info(`Logged in as ${client.user.tag}. ${status}`);
});

client.on('message', async (msg: Discord.Message) => {
  const msgContent = msg.content.toLowerCase();
  if (!msgContent.startsWith(prefix)) return;

  logger.info(
    `processing command: '${msgContent}' by user '${msg.author.username}' in channel '${msg.channel}' in guild '${msg.guild}'`
  );

  try {
    const command = commands.find(c =>
      some(c.cmd, c => msgContent.startsWith(`${prefix}${c}`))
    );
    if (command) {
      await command.action(msg);
    } else {
      msg.reply('no dice.');
    }
  } catch (e) {
    logger.error(e);
    msg.member.voiceChannel.leave();
  }
});

client.on('debug', m => logger.debug(m));
client.on('warn', m => logger.warn(m));
client.on('error', m => logger.error(m.message));

process.on('uncaughtException', error => logger.error(error.message));

client.login(process.env.DISCORD_BOT_TOKEN);
