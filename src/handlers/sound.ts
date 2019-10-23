import Discord from 'discord.js';
import {sample} from 'lodash';
import path from 'path';

import {args} from '../args';
import {Handler, logger, sounds} from '../index';

const play = async (msg: Discord.Message) => {
  if (!msg.member.voiceChannel) return msg;

  const connection = await msg.member.voiceChannel.join();
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
    const dispatcher = connection.playFile(
      path.join(__dirname, `../../sounds/${file}`)
    );

    dispatcher.on('start', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (connection.player as any).streamingData.pausedTime = 0;
    });

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
