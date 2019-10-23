import Discord from 'discord.js';
import {some} from 'lodash';

import {logger, prefix} from './index';

export interface Handler {
  cmd: Array<string>;
  action(msg: Discord.Message): Promise<Discord.Message>;
}

export const commands: Array<Handler> = [];

export const message = async (msg: Discord.Message) => {
  const msgContent = msg.content.toLowerCase();
  if (!msgContent.startsWith(prefix)) return;

  logger.info(
    `processing command: '${msgContent}' by user '${msg.author.username}' in channel '${msg.channel}' in guild '${msg.guild}'`
  );

  try {
    const command = commands.find(c =>
      some(c.cmd, c => msgContent.startsWith(`${prefix}${c}`))
    );
    if (command) {
      await command.action(msg);
    } else {
      msg.reply('no dice.');
    }
  } catch (e) {
    logger.error(e);
    if (msg.member) {
      msg.member.voice.channel && msg.member.voice.channel.leave();
    }
  }
};
