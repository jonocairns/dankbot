const config = require('../config.json');
const Player = require('./player.js');
const random = require('random-js')();
const request = require('request');

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
		let helpMessage = '**Dank memes**\r\n\r\n';
		const characterMessageLimit = 2000;
		const chunks = [];
		const functionality = [];
		const tts = [];

		commands.forEach((type, command) => {
			const a = command.toString().split('/')[1];
			const mes = `${a}, `;

			if (type[0] === 'function') {
				functionality.push(a);
			} else if (type[0] === 'sound') {
				if ((helpMessage.length + mes.length) < characterMessageLimit) {
					helpMessage += mes;
				} else {
					chunks.push(helpMessage);
					helpMessage = '';
				}
			} else if (type[0] === 'text') {
				tts.push(a);
			}
		});

		chunks.push(helpMessage);
		const funcString = functionality.join(', ');
		const ttsString = tts.join(', ');
		message.member.sendMessage(`**Functions**\r\n\r\n${funcString}`);
		message.member.sendMessage(`**Text-to-speech**\r\n\r\n${ttsString}`);
		chunks.forEach((chunk) => {
			message.member.sendMessage(chunk);
		});
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

	static getInviteLink(message) {
		message.member.sendMessage('Go to the following link and auth me to your dank server.');
		message.member.sendMessage(`https://discordapp.com/oauth2/authorize?client_id=${config.discordClientId}&scope=bot&permissions=3668992`);
	}

	static yomama(message) {
		request('http://api.yomomma.info/', (msg, response, body) => {
			const joke = JSON.parse(body).joke;
			message.channel.sendTTSMessage(joke);
		});
	}

	static coin(message) {
		const coinFlip = ['Heads', 'Tails'];
		const coinFlipResponse = random.pick(coinFlip);
		message.channel.sendMessage(coinFlipResponse);
	}

	static chunkSend(payload, channel) {
		console.log('chunking payload...');

		if (payload.length === 0) {
			return;
		}
		const chunks = [];
		const chunk = 1999;
		for (let i = 0; i < payload.length; i += chunk) {
			chunks.push(payload.slice(i, i + chunk));
		}
		chunks.forEach((item) => {
			channel.sendMessage(item);
		});
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
