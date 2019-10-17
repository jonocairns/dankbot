import Discord from 'discord.js';
import ytdl from 'ytdl-core';

import {clean} from './clean';

export const youtube = (
  msg: Discord.Message,
  connection: Discord.VoiceConnection
) => {
  const url = msg.content.split(' ').pop();
  if (url) {
    const stream = ytdl(url, {filter: 'audioonly'});
    const dispatcher = connection.playStream(stream);

    clean(dispatcher, msg);
  }
};
