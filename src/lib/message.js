const config = require('../config.json');
const Player = require('./player.js');
const urban = require('urban');
const omdb = require('omdb');
const random = require('random-js')();

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
		const characterMessageLimit = 2000;
		const chunks = [];

		commands.forEach((fileName, command) => {
			const mes = `${command.toString().split('/')[1]}\t`;

			if ((helpMessage.length + mes.length) < characterMessageLimit) {
				helpMessage += mes;
			} else {
				chunks.push(helpMessage);
				helpMessage = mes;
			}
		});

		chunks.push(helpMessage);

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
		message.member.sendMessage(`https://discordapp.com/oauth2/authorize?client_id=${config.discordClientId}&scope=bot&permissions=0`);
	}

	static omdb(message) {
		const contents = message.content.split('"');
		const query = contents[1];

		omdb.search(query, (err, movies) => {
			if (err) {
				console.error(err);
				return;
			}
			console.log(movies);
			if (movies.length < 1) {
				message.channel.sendMessage('No movies were found!');
			} else {
				console.log(movies[0]);
				const movie = movies[0];
				const tomato = movie.tomato ? movie.tomato : { rating: 'not found' };
				message.channel.sendMessage(`${movie.title} (${movie.year})\r\nimdb: (${movie.imdb.rating ? movie.imdb.rating : 'not found'}/10)\r\ntomato: (${tomato.rating})`);
				if (movie.plot) {
					console.log(movie.plot);
					const plot = movie.plot.split(' ');
					Message.chunkSend(plot, message.channel);
				}
			}
		});
	}

	static urbanDictionary(message) {
		const contents = message.content.split(' ').splice(1).join();

		const res = urban(contents);

		res.first((payload) => {
			if (payload && payload.definition) {
				const chunky = payload.definition.split(' ');
				Message.chunkSend(chunky, message.channel);
			} else {
				message.channel.sendMessage(`I couldn't fucking find any results for '${contents}. Maybe try getting good?'`);
			}
		});
	}

	static coin(message) {
		const coinFlip = ['Heads', 'Tails'];
		const coinFlipResponse = random.pick(coinFlip);
		message.channel.sendMessage(coinFlipResponse);
	}

	static chunkSend(payload, channel) {
		const charLimit = 2000;
		let mes = '';
		const chunks = [];
		payload.forEach((item) => {
			if ((mes.length + item.length) < charLimit) {
				mes += `${mes} `;
			} else {
				chunks.push(mes);
				mes = '';
			}
		});
		chunks.push(mes);
		chunks.forEach((chunk) => {
			channel.sendTTSMessage(chunk);
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
