import Discord from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
const client = new Discord.Client();
const sounds: Array<string> = [];

fs.readdir(path.join(__dirname, '../sounds'), (err, files) => {
  if (err) {
    return console.log('Unable to scan directory: ' + err);
  }
  files.forEach(file => sounds.push(file));
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

let timer: NodeJS.Timeout;

client.on('message', (msg: Discord.Message) => {
  if (!msg.content.startsWith('.')) return;
  if (!msg.guild) return;

  if (msg.member.voiceChannel) {
    msg.member.voiceChannel
      .join()
      .then((connection: Discord.VoiceConnection) => {
        let targetFile = msg.content.split('.').pop();

        if (targetFile === 'leave') msg.member.voiceChannel.leave();

        if (targetFile === 'meme')
          targetFile = sounds[Math.floor(Math.random() * sounds.length)]
            .split('.')
            .shift();

        const file = sounds.find(s => s.split('.').shift() === targetFile);

        if (file) {
          const dispatcher = connection.playFile(
            path.join(__dirname, `../sounds/${file}`)
          );

          dispatcher.on('end', () => {
            msg.delete();
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
              connection.disconnect();
            }, 600000);
          });

          dispatcher.on('error', (e: Error) => {
            console.log(e);
          });
        }
      })
      .catch(console.log);
  } else {
    msg.reply('You need to join a voice channel first!');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
