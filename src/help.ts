import Discord from 'discord.js';

import {languages} from './speech';

export const help = (msg: Discord.Message) => {
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
      '.speak',
      'will say a some words in the voice channel you are in e.g. `.speak i love lamp`'
    )
    .addField(
      '.lang',
      `will switch the voice acent, possible values are: ${languages
        .map(l => l.short)
        .join(', ')} e.g. \`.lang english\``
    )
    .addField('.joke', 'will say a random joke in the current voice channel')
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
};
