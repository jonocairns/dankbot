import Discord from 'discord.js';
import {sample} from 'lodash';
import path from 'path';

import {args} from '../args';
import {logger, sounds} from '../index';
import {Handler} from '../message';

const play = async (msg: Discord.Message) => {
  if (!msg.member || !msg.member.voice.channel) return msg;

  const connection = await msg.member.voice.channel.join();
  if (!connection || !msg.guild) return msg;

  let arg = args(msg.content);

  if (arg && arg.toLowerCase() === 'meme') {
    const random = sample(sounds) || '';
    arg = random.split('.').shift();
  }

  const file = sounds.find(
    s => arg && s.split('.').shift() === arg.toLowerCase()
  );

  if (file) {
    const dispatcher = connection.play(
      path.join(__dirname, `../../sounds/${file}`)
    );

    dispatcher.on('error', e => {
      logger.error(e);
      connection.disconnect();
      msg.delete();
    });

    dispatcher.on('end', () => {
      msg.delete();
    });
  }

  return msg;
};
const sound: Handler = {
  cmd: ['meme'].concat(sounds.map(s => s.split('.')[0])),
  action: (msg: Discord.Message): Promise<Discord.Message> => play(msg),
};

export default sound;
