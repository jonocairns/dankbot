import Discord from 'discord.js';

export const help = (msg: Discord.Message) => {
  const embed = new Discord.RichEmbed()
    .addField(
      '.meme',
      'this command will play a random dank meme in the channel you are in'
    )
    .addField(
      '.yt',
      'this is to be used in combination with a youtube URL e.g. `.yt https://youtube.com/watch?v=yourvideo`'
    )
    .addField(
      '.eg',
      'will return a sample of the possible sounds you can play'
    );
  msg.channel.send(embed);
};
