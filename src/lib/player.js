const Logger = require('./logger.js');
const config = require('../config.json');
const Database = require('./db.js');

class Player {

  playSound(authorVoiceChannel, command, sound) {
    if (authorVoiceChannel) {
      authorVoiceChannel.join().then((connection,
                joinError) => {
        if (joinError) {
          const joinErrorMessage =
                        'Error joining voice channel: ';
          Logger.logError(joinError, joinErrorMessage);
        }
        const dispatcher = connection.playFile(config.soundPath + sound);

        dispatcher.on('error', (err) => {
          Logger.logError(err,
                        `There was an playing the sound ${config.soundPath + sound}`
                    );
        });
        dispatcher.on('end', () => {
          Database.load({ command }, 'stats', (i) => {
            console.log(i);
            if (i.length === 0) {
              Database.update({ command }, { $setOnInsert: { count: 1 } }, 'stats', (err) => {
                console.log(err);
              });
            } else {
              Database.update({ command }, { $inc: { count: 1 } }, 'stats', (err) => {
                console.log(err);
              });
            }
          });
        });
      }).catch((e) => {
        Logger.trace(
                    `There was an issue joining the channel ${authorVoiceChannel.name} to play the command ${command}`
                );
        Logger.logError(e);
      });
    }
  }

  introSounds(newChannel, user, intro) {
    intro.forEach((element) => {
      if (user.user.username === element.user) {
        const cmd = `!${element.sound}`;
        const fileName = `${element.sound}.${element.ext}`;
        this.playSound(newChannel, cmd, fileName);
      }
    });
  }
}
module.exports = Player;
