import Discord from 'discord.js';
import {sampleSize} from 'lodash';

import {prefix, sounds} from '../index';
import {Handler} from '../message';

const h = async (msg: Discord.Message): Promise<Discord.Message> => {
  const msgContent = msg.content.toLowerCase();
  if (msgContent.startsWith(`${prefix}eg`)) {
    const examples = sampleSize(sounds, 10);
    msg.channel.send(examples.map(e => e.split('.')[0]));
    return msg;
  }

  if (msgContent.startsWith(`${prefix}leave`)) {
    msg.member && msg.member.voice.channel && msg.member.voice.channel.leave();
    return msg.delete();
  }

  const embed = new Discord.MessageEmbed()
    .addField(
      'how can I invite you to my server?',
      'use this link -> https://bit.ly/2MURMYo'
    )
    .addField(
      '.meme',
      'this command will play a random dank meme in the channel you are in'
    )
    .addField(
      '.yt',
      'this is to be used in combination with a youtube URL e.g. `.yt https://youtube.com/watch?v=yourvideo`'
    )
    .addField('.eg', 'will return a sample of the possible sounds you can play')
    .addField(
      '.leave',
      `will make the bot leave the voice channel they're currently in`
    );
  if (msg.member) {
    msg.member.send(embed);
    msg.delete();
  } else {
    msg.reply(embed);
  }
  return msg;
};

const help: Handler = {
  cmd: ['help', 'eg', 'leave'],
  action: (msg: Discord.Message): Promise<Discord.Message> => h(msg),
};

export default help;
