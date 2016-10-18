'use strict';
var fs = require('fs');
var logger = require('./logger.js');
var file = require('./file.js');

var playSound = function(authorVoiceChannel, command, sound) {
    if (authorVoiceChannel) {
        authorVoiceChannel.join().then(function(connection,
            joinError) {
            if (joinError) {
                var joinErrorMessage =
                    'Error joining voice channel: ';
                logger.logError(joinError, joinErrorMessage);
            }
            const dispatcher = connection.playFile(config.soundPath + sound).then(
                function(intent) {
                    intent.on('error', function(streamError) {
                        var streamErrorMessage =
                            'Error streaming sound file: ';
                        logger.logError(streamError, streamErrorMessage);

                     });
                    file.incrementSoundStats(command, stats);
                    if (config.autoLeaveVoice) {
                        intent.on('end', function() {
                            connection.destroy();
                        });
                    }
                }).catch(function() {
                logger.trace(
                    `There was an issue attempting to play the file ${sound}`
                );
            });
        }).catch(function() {
            logger.trace(
                `There was an issue joining the channel ${authorVoiceChannel.name} to play the command ${command}`
            );
        });
    }
}

var regExpToCommand = function(command) {
    return command.toString().split('/')[1];
}

var playRandomSound = function(message) {
    var keys = [...commands.keys()];
    var randomKey;
    var randomValue = ['', ''];
    while (randomValue[0] !== 'sound') {
        randomKey = keys[Math.round(keys.length * Math.random())];
        randomValue = commands.get(randomKey);
    }
    playSound(message.member.voiceChannel, regExpToCommand(
        randomKey), randomValue[1]);
}

var introSounds = function(newChannel, user, intro) {
    intro.forEach(function(element, index, array) {
        if (user.user.username === element.user) {
            let cmd = `!${element.sound}`;
            let fileName = `${element.sound}.${element.ext}`;
            playSound(newChannel, cmd, fileName);
        }
    });
}

module.exports.introSounds = introSounds;
module.exports.playSound = playSound;
module.exports.playRandomSound = playRandomSound;