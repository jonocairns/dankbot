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

	static isUserAdmin(username) {
		const admins = config.admins.split(',');
		let isAdmin = false;
		admins.forEach((bannedUsername) => {
			if (bannedUsername === username) {
				isAdmin = true;
			}
		});
		return isAdmin;
	}

	static messageHandler(message, bot, commands) {
		if (Message.isUserAdmin(message.author.username) && message.content === '.restart') {
			message.channel.sendMessage('brb fgts...').then((ms) => {
				ms.delete(2000).then(() => {
					console.log(`restarting bot. issued by ${message.author.username}`);
					process.exit();
				});
			});
		}
		if (message.author.username !== bot.user.username && !Message.isUserBanned(message.author.username)) {
			commands.forEach((botReply, regexp) => {
				const msg = message.content.toLowerCase();
				const cmd = regexp.toLowerCase();
				if (msg.startsWith(cmd) || msg.startsWith(cmd.replace('.', '!'))) {
					try {
						switch (botReply[0]) {
						case 'function':
							botReply[1](message, commands, bot);
							break;
						case 'sound':
							Player.playSound(message, botReply[1]);
							break;
						case 'text':
							message.channel.sendTTSMessage(botReply[1]);
							break;
						default:
							break;
						}
					} finally {
					}
				}
			});
		}
	}
}

module.exports = Message;
