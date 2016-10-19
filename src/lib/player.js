'use strict';
var Logger = require('./logger.js');
const config = require('../config.json');
const Database = require('./db.js')

class Player {
    constructor() {
        this.logger = new Logger();
        this.db = new Database();
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
                    this.db.load({ command: command }, 'stats', (i) => {
                        console.log(i);
                        if(i.length === 0){
                            this.db.update({ command: command}, { $setOnInsert: { count: 1 }}, 'stats', (err,data) => {
                            });
                        } else {
                            this.db.update({ command: command}, { $inc: { count: 1 }}, 'stats', (err,data) => {
                            });
                        }
                    });
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