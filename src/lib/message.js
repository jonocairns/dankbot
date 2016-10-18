'use strict';
const config = require('../config.json');

var displayCommands = function(message) {
    var helpMessage = '';
    if (message.content.split(' ')[2]) {
        var helpFilter = new RegExp(message.content.split(' ')[2], 'i');
        commands.forEach(function(fileName, command) {
            if (command.toString().match(helpFilter)) {
                helpMessage += regExpToCommand(command) + '\n';
            }
        });
    } else {
        commands.forEach(function(fileName, command) {
            helpMessage += regExpToCommand(command) + '\n';
        });
    }
    message.member.sendMessage(helpMessage);
}

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

var messageHandler = function(message) {
    firstConnect = false;

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

var letsPlay = function(message) {

    message.channel.sendTTSMessage(`It's time for some cs boys. Chairs boys.`);

    let usersNamesOnline = [];
    bot.users.forEach(function(user){
        if(user.status === 'online') {
            usersNamesOnline.push(user.username);
            user.sendMessage(`Keen for cs?`);
        }
    });

    let usersOnline = usersNamesOnline.join(', ')

    message.channel.sendMessage(`The number of fgts online is ${usersNamesOnline.length}. ${usersOnline}`);
    
}

module.exports.letsPlay = letsPlay;
module.exports.messageHandler = messageHandler;
module.exports.displayCommands = displayCommands;
