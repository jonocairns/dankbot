import Discord from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import {sampleSize} from 'lodash';
import path from 'path';
import winston from 'winston';

import {help} from './help';
import {play} from './sound';
import {languages, setLang, speech} from './speech';
import {youtube} from './youtube';

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

client.on('ready', async () => {
  const status = await fetchStatus();
  client.user.setActivity('you from a distance', {type: 'WATCHING'});

  logger.info(`Logged in as ${client.user.tag}. ${status}`);
});

client.on('message', async (msg: Discord.Message) => {
  const msgContent = msg.content.toLowerCase();
  if (!msgContent.startsWith(prefix)) return;

  if (msgContent.startsWith(`${prefix}help`)) {
    help(msg);
    return;
  }

  if (msgContent.startsWith(`${prefix}stats`)) {
    const status = await fetchStatus();
    msg.reply(status);
    return;
  }

  if (msgContent.startsWith(`${prefix}lang`)) {
    const targetLang = msgContent.replace('.lang', '');
    const lang = languages.find(l => l.short === targetLang.trim());

    if (lang) {
      setLang(lang);
    }
    msg.delete();
    return;
  }

  if (msgContent.startsWith(`${prefix}eg`)) {
    msg.channel.send(sampleSize(sounds, 10));
    msg.delete();
    return;
  }

  if (!msg.guild) return;

  if (msg.member.voiceChannel) {
    msg.member.voiceChannel
      .join()
      .then(async connection => {
        try {
          msg.react(`👍`);
          if (timer) clearTimeout(timer);
          if (msgContent.startsWith(`${prefix}leave`)) {
            msg.member.voiceChannel.leave();
          } else if (msgContent.startsWith(`${prefix}yt`)) {
            youtube(msg, connection);
          } else if (msgContent.startsWith(`${prefix}speak`)) {
            speech(msg, connection);
          } else {
            play(msg, connection);
          }
        } catch (e) {
          logger.log(e);
        }
      })
      .catch(logger.log);
  } else {
    msg.reply('You need to join a voice channel first!');
    msg.delete();
  }
});

client.on('guildMemberSpeaking', (m, speaking) => {
  logger.info(m);
});

client.on('debug', m => logger.debug(m));
client.on('warn', m => logger.warn(m));
client.on('error', m => logger.error(m.message));

process.on('uncaughtException', error => logger.error(error.message));

client.login(process.env.DISCORD_BOT_TOKEN);
