'use strict';
const config = require('../config.json');
const player = require('./player.js');

class Message {
    isUserBanned(username) {
        var banlist = config.banList.split(',');
        var isBanned = false;
        banlist.forEach((bannedUsername) => {
            if (bannedUsername === username) {
                isBanned = true;
            }
        });
        return isBanned;
    }

    regExpToCommand(command) {
        return command.toString().split('/')[1];
    }

    messageHandler(message, bot, commands) {
        if (message.author.username !== bot.user.username && !this.isUserBanned(
            message.author.username)) {
            
            commands.forEach((botReply, regexp) => {
                
                if (message.content.match(regexp)) {
                    try {
                        switch (botReply[0]) {
                            case 'function':
                                botReply[1](message, commands);
                                break;
                            case 'sound':
                                player.playSound(message.member.voiceChannel,
                                    this.regExpToCommand(regexp), botReply[1]
                                );
                                break;
                            case 'text':
                                message.channel.sendTTSMessage(botReply[1]);
                                break;
                            default:
                                break;
                        }
                    } finally {
                        message.delete();
                    }
                    
                }
            });
        }
    }
}

module.exports = new Message;
