import Discord from 'discord.js';

import {logger, setTimer, timer} from './index';

export const clean = (
  dispatcher: Discord.StreamDispatcher,
  msg: Discord.Message
) => {
  dispatcher.on('end', () => {
    msg.delete();
    if (timer) clearTimeout(timer);
    setTimer(
      setTimeout(() => {
        msg.member.voiceChannel.leave();
      }, 3600000)
    );
  });

  dispatcher.on('error', e => {
    logger.error(e);
  });
};
