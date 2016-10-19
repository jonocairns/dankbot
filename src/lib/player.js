'use strict';
var logger = require('./logger.js');
const config = require('../config.json');

class Player {
    playSound(authorVoiceChannel, command, sound) {
        if (authorVoiceChannel) {
            authorVoiceChannel.join().then((connection,
                joinError) => {
                if (joinError) {
                    var joinErrorMessage =
                        'Error joining voice channel: ';
                    logger.logError(joinError, joinErrorMessage);
                }
                connection.playFile(config.soundPath + sound).on('error', (err) => {
                    logger.logError(err,
                        `There was an playing the sound ${config.soundPath + sound}`
                    );
                });;
            }).catch((e) => {
                logger.trace(
                    `There was an issue joining the channel ${authorVoiceChannel.name} to play the command ${command}`
                );
                logger.logError(e);
            });
        }
    }

    playRandomSound(message, commands) {
        var keys = [...commands.keys()];
        var randomKey;
        var randomValue = ['', ''];
        while (randomValue[0] !== 'sound') {
            randomKey = keys[Math.round(keys.length * Math.random())];
            randomValue = commands.get(randomKey);
        }
        this.playSound(message.member.voiceChannel, randomKey.toString().split('/')[1], randomValue[1]);
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

module.exports = new Player();