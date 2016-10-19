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
        if (message.author.username !== bot.user.username && !isUserBanned(
            message.author.username)) {
            
            commands.forEach((botReply, regexp) => {
                
                if (message.content.match(regexp)) {
                    
                    switch (botReply[0]) {
                        case 'function':
                            botReply[1](message, commands);
                            message.delete();
                            break;
                        case 'sound':
                            player.playSound(message.member.voiceChannel,
                                regExpToCommand(regexp), botReply[1]
                            );
                            message.delete();
                            break;
                        case 'text':
                            message.channel.sendTTSMessage(botReply[1]);
                            message.delete();
                            break;
                        default:
                            break;
                    }
                }
            });
        }
    }
}

module.exports = new Message;
