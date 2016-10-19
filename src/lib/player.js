'use strict';
var Logger = require('./logger.js');
const config = require('../config.json');

class Player {
    constructor() {
        this.logger = new Logger();
    }

    playSound(authorVoiceChannel, command, sound) {
        if (authorVoiceChannel) {
            authorVoiceChannel.join().then((connection,
                joinError) => {
                if (joinError) {
                    var joinErrorMessage =
                        'Error joining voice channel: ';
                    this.logger.logError(joinError, joinErrorMessage);
                }
                const dispatcher = connection.playFile(config.soundPath + sound);
                
                dispatcher.on('error', (err) => {
                    this.logger.logError(err,
                        `There was an playing the sound ${config.soundPath + sound}`
                    );
                });
                dispatcher.on('end', () => {
                });
            }).catch((e) => {
                this.logger.trace(
                    `There was an issue joining the channel ${authorVoiceChannel.name} to play the command ${command}`
                );
                this.logger.logError(e);
            });
        }
    }

    introSounds(newChannel, user, intro) {
        intro.forEach((element, index, array) => {
            if (user.user.username === element.user) {
                let cmd = `!${element.sound}`;
                let fileName = `${element.sound}.${element.ext}`;
                this.playSound(newChannel, cmd, fileName);
            }
        });
    }
}
module.exports = Player;