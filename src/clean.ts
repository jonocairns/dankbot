import Discord from 'discord.js';

export const clean = (
  dispatcher: Discord.StreamDispatcher,
  msg: Discord.Message
) => {
  dispatcher.on('end', () => {
    msg.delete();
  });

  dispatcher.on('error', e => {
    console.log(e);
  });
};
