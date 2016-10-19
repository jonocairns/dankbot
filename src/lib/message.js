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

    displayCommands(message, commands) {
        var helpMessage = '';
        if (message.content.split(' ')[2]) {
            var helpFilter = new RegExp(message.content.split(' ')[2], 'i');
            commands.forEach((fileName, command) => {
                if (command.toString().match(helpFilter)) {
                    helpMessage += `${command.toString().split('/')[1]}\t`;
                }
            });
        } else {
            commands.forEach((fileName, command) => {
                helpMessage += `${command.toString().split('/')[1]}\t`;
            });
        }
        message.member.sendMessage(helpMessage);
    }

    letsPlay(message, commands, bot) {
        message.channel.sendTTSMessage(`It's time for some cs boys. Chairs boys.`);

        let usersNamesOnline = [];
        bot.users.forEach((user) =>{
            if(user.status === 'online') {
                usersNamesOnline.push(user.username);
                user.sendMessage(`Keen for cs?`);
            }
        });

        let usersOnline = usersNamesOnline.join(', ')

        message.channel.sendMessage(`The number of fgts online is ${usersNamesOnline.length}. ${usersOnline}`);
    }

    messageHandler(message, bot, commands) {
        if (message.author.username !== bot.user.username && !this.isUserBanned(
            message.author.username)) {
            
            commands.forEach((botReply, regexp) => {
                
                if (message.content.match(regexp)) {
                    try {
                        switch (botReply[0]) {
                            case 'function':
                                botReply[1](message, commands, bot);
                                break;
                            case 'sound':
                                player.playSound(message.member.voiceChannel,
                                    regexp.toString().split('/')[1], botReply[1]
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

module.exports = new Message();
