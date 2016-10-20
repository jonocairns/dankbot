const config = require('../config.json');
const Player = require('./player.js');

class Message {
	constructor() {
		this.player = new Player();
	}

	static isUserBanned(username) {
		const banlist = config.banList.split(',');
		let isBanned = false;
		banlist.forEach((bannedUsername) => {
			if (bannedUsername === username) {
				isBanned = true;
			}
		});
		return isBanned;
	}

	static displayCommands(message, commands) {
		let helpMessage = '';
		if (message.content.split(' ')[2]) {
			const helpFilter = new RegExp(message.content.split(' ')[2], 'i');
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

	static letsPlay(message, commands, bot) {
		message.channel.sendTTSMessage('It\'s time for some cs boys. Chairs boys.');

		const usersNamesOnline = [];
		bot.users.forEach((user) => {
			if (user.status === 'online') {
				usersNamesOnline.push(user.username);
				user.sendMessage('Keen for cs?');
			}
		});

		const usersOnline = usersNamesOnline.join(', ');

		message.channel.sendMessage(`The number of fgts online is ${usersNamesOnline.length}. ${usersOnline}`);
	}

	static messageHandler(message, bot, commands) {
		if (message.author.username !== bot.user.username && !Message.isUserBanned(
            message.author.username)) {
			commands.forEach((botReply, regexp) => {
				if (message.content.match(regexp)) {
					try {
						switch (botReply[0]) {
						case 'function':
							botReply[1](message, commands, bot);
							break;
						case 'sound':
							Player.playSound(message.member.voiceChannel,
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

module.exports = Message;
