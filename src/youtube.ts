import Discord from 'discord.js';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';

import {clean} from './clean';
import {logger} from './index';

export const youtube = (
  msg: Discord.Message,
  connection: Discord.VoiceConnection
) => {
  const url = msg.content.split(' ').pop();

  if (url) {
    msg.react(`🎵`);

    if (ytdl.validateURL(url)) {
      const stream = ytdl(url, {filter: 'audioonly', highWaterMark: 1 << 25});
      const dispatcher = connection.playStream(stream);
      clean(dispatcher, msg);
    } else {
      ytsr(msg.content.replace('.yt', ''), {}, (err, results) => {
        if (err) {
          logger.error(err.message);
        }
        if (results.items.length > 0) {
          const stream = ytdl(results.items[0].link, {
            filter: 'audioonly',
            highWaterMark: 1 << 25,
          });
          const dispatcher = connection.playStream(stream);
          clean(dispatcher, msg);
        }
      });
    }
  }
};
