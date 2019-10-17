import Discord from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import {sampleSize} from 'lodash';
import path from 'path';

import {help} from './help';
import {play} from './sound';
import {youtube} from './youtube';

dotenv.config();
const client = new Discord.Client();
export const sounds: Array<string> = [];
export let timer: NodeJS.Timeout;
export const setTimer = (t: NodeJS.Timeout) => {
  timer = t;
};

fs.readdir(path.join(__dirname, '../sounds'), (err, files) => {
  if (err) {
    return console.log('Unable to scan directory: ' + err);
  }
  files.forEach(file => sounds.push(file));
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', (msg: Discord.Message) => {
  if (!msg.content.startsWith('.')) return;

  if (msg.content.startsWith('.help')) {
    help(msg);
    return;
  }

  if (msg.content.startsWith('.eg')) {
    msg.channel.send(sampleSize(sounds, 10));
    return;
  }

  if (!msg.guild) return;

  if (msg.member.voiceChannel) {
    msg.member.voiceChannel
      .join()
      .then(connection => {
        if (timer) clearTimeout(timer);
        if (msg.content.startsWith('.leave')) {
          msg.member.voiceChannel.leave();
        } else if (msg.content.startsWith('.yt')) {
          youtube(msg, connection);
        } else {
          play(msg, connection);
        }
      })
      .catch(console.log);
  } else {
    msg.reply('You need to join a voice channel first!');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
