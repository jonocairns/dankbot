'use strict';
const config = require('../config.json');

var isUserBanned = function(username) {
    var banlist = config.banList.split(',');
    var isBanned = false;
    banlist.forEach(function(bannedUsername) {
        if (bannedUsername === username) {
            isBanned = true;
        }
    });
    return isBanned;
}

var messageHandler = function(message, bot) {
    if (message.author.username !== bot.user.username && !isUserBanned(
        message.author.username)) {
        
        commands.forEach(function(botReply, regexp) {
            
            if (message.content.match(regexp)) {
                
                switch (botReply[0]) {
                    case 'function':
                        botReply[1](message);
                        message.delete();
                        break;
                    case 'sound':
                        player.playSound(message.member.voiceChannel,
                            regExpToCommand(regexp), botReply[1]
                        );
                        message.delete();
                        break;
                    case 'text':
                        sendMessage(botReply[1]);
                        message.delete();
                        break;
                    default:
                        break;
                }
            }
        });
    }
}

module.exports.messageHandler = messageHandler;
