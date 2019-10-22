import Discord from 'discord.js';
import {sampleSize} from 'lodash';

import {Handler, prefix, sounds} from '../index';

const h = async (msg: Discord.Message): Promise<Discord.Message> => {
  const msgContent = msg.content.toLowerCase();
  if (msgContent.startsWith(`${prefix}eg`)) {
    msg.channel.send(sampleSize(sounds, 10));
    return msg.delete();
  }

  if (msgContent.startsWith(`${prefix}leave`)) {
    msg.member.voiceChannel.leave();
    return msg.delete();
  }

  const embed = new Discord.RichEmbed()
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
