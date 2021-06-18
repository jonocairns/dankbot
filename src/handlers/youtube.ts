import Discord from 'discord.js';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';

import {logger} from '../index';
import {Handler} from '../message';

const playUrl = (url: string, connection: Discord.VoiceConnection) => {
  const stream = ytdl(url, {
    filter: 'audioonly',
    highWaterMark: 1 << 25,
  });

  const dispatcher = connection.play(stream);
  dispatcher.on('error', e => {
    logger.error(e);
  });
};

export const yt = async (msg: Discord.Message): Promise<Discord.Message> => {
  if (!msg.member || !msg.member.voice.channel) return msg;

  const connection = await msg.member.voice.channel.join();
  if (!connection || !msg.guild) return msg;
  const url = msg.content.split(' ').pop();

  if (url) {
    if (ytdl.validateURL(url)) {
      playUrl(url, connection);
    } else {
      const results = await ytsr(msg.content.toLowerCase().replace('.yt', ''), {
        limit: 1,
      });
      if (results.items.length > 0) {
        playUrl(results.items[0].url, connection);
      }
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
