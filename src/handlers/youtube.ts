import Discord from 'discord.js';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';

import {Handler, logger} from '../index';

const playUrl = (url: string, connection: Discord.VoiceConnection) => {
  const stream = ytdl(url, {
    filter: 'audioonly',
    highWaterMark: 1 << 25,
  });
  const dispatcher = connection.playStream(stream);
  dispatcher.on('error', e => {
    logger.error(e);
  });
};

export const yt = async (msg: Discord.Message): Promise<Discord.Message> => {
  if (!msg.member.voiceChannel) return msg;

  const connection = await msg.member.voiceChannel.join();
  if (!connection || !msg.guild) return msg;
  const url = msg.content.split(' ').pop();

  if (url) {
    if (ytdl.validateURL(url)) {
      playUrl(url, connection);
    } else {
      ytsr(msg.content.toLowerCase().replace('.yt', ''), {}, (err, results) => {
        if (err) {
          logger.error(err.message);
        }
        if (results.items.length > 0) {
          playUrl(results.items[0].link, connection);
        }
      });
    }
    await msg.react(`🎵`);
  }
  return msg.delete();
};

const youtube: Handler = {
  cmd: ['yt'],
  action: (msg: Discord.Message): Promise<Discord.Message> => yt(msg),
};

export default youtube;
