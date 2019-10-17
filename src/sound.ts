import Discord from 'discord.js';
import path from 'path';

import {clean} from './clean';
import {sounds} from './index';

export const play = (
  msg: Discord.Message,
  connection: Discord.VoiceConnection
) => {
  let targetFile = msg.content.split('.').pop();

  if (msg.content.startsWith('.meme')) {
    targetFile = sounds[Math.floor(Math.random() * sounds.length)]
      .split('.')
      .shift();
  }

  const file = sounds.find(s => s.split('.').shift() === targetFile);

  if (file) {
    const dispatcher = connection.playFile(
      path.join(__dirname, `../sounds/${file}`)
    );

    clean(dispatcher, msg);
  }
};
