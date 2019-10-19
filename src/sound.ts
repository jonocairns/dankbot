import Discord from 'discord.js';
import {sample} from 'lodash';
import path from 'path';

import {args} from './args';
import {clean} from './clean';
import {sounds} from './index';

export const play = (
  msg: Discord.Message,
  connection: Discord.VoiceConnection
) => {
  let arg = args(msg.content);

  if (arg === 'meme') {
    const random = sample(sounds) || '';
    arg = random.split('.').shift();
  }

  const file = sounds.find(s => s.split('.').shift() === arg);

  if (file) {
    const dispatcher = connection.playFile(
      path.join(__dirname, `../sounds/${file}`)
    );

    clean(dispatcher, msg);
  }
};
