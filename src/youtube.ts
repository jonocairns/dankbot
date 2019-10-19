import Discord from 'discord.js';
import ytdl from 'ytdl-core';

import {clean} from './clean';

export const youtube = (
  msg: Discord.Message,
  connection: Discord.VoiceConnection
) => {
  const url = msg.content.split(' ').pop();

  if (url) {
    msg.react(`🎵`);
    const stream = ytdl(url, {filter: 'audioonly', highWaterMark: 1 << 25});
    const dispatcher = connection.playStream(stream);

    clean(dispatcher, msg);
  }
};
