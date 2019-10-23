import {client, logger} from './index';
import {commands} from './message';
import {readFiles} from './util';

export const ready = async () => {
  client.user &&  client.user.setActivity('you from a distance', {type: 'WATCHING'});

  logger.debug(`initialising handlers...`);

  readFiles('./handlers', files => {
    files.forEach(async file => {
      const handlerFileName = file.split('.')[0];
      const handler = await import(`./handlers/${handlerFileName}`);
      commands.push(handler.default);
    });
    logger.debug(`loaded handlers: 
      ${files.map(f => f.split('.')[0]).join(', ')}...`);
  });

  logger.info(
    `Logged in as ${client.user && client.user.tag}. Serving ${
      client.guilds.array().length
    } guild(s)`
  );
};
