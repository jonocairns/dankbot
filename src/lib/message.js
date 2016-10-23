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
			if (movies.length < 1) {
				message.channel.sendMessage('No movies were fucking found. Try not searching for something retarded maybe?');
			} else {
				const mv = movies[0];
				omdb.get({ title: mv.title, year: mv.year }, true, (e, movie) => {
					if (e) {
						console.error(e);
						return;
					}
					const tomato = movie.tomato;
					const tomatoString = `\r\n\r\ntomato: (${tomato})`;
					const imdbString = `\r\n\r\nimdb: (${movie.imdb.rating}/10)`;
					message.channel.sendMessage(`:movie_camera:${movie.title} (${movie.year})${movie.imdb.rating ? imdbString : ''}${tomato ? tomatoString : ''}`);
					if (movie.plot) {
						console.log(movie.plot);
						if (movie.plot.length > 2000) {
							const plot = movie.plot.split(' ');
							Message.chunkSend(plot, message.channel);
						} else {
							message.channel.sendTTSMessage(movie.plot);
						}
					}
				});
			}
		});
	}

	static urbanDictionary(message) {
		const contents = message.content.split('"')[1];

		const res = urban(contents);

		res.first((payload) => {
			console.log(`urban dictionary query returned for ${contents}. Payload: ${payload}`);
			if (payload && payload.definition) {
				console.log(payload.definition);
				if (payload.definition.length > 2000) {
					const chunky = payload.definition.split(' ');
					Message.chunkSend(chunky, message.channel);
				} else {
					message.channel.sendTTSMessage(payload.definition);
				}
			} else {
				message.channel.sendMessage(`I couldn't fucking find any results for '${contents}'. Maybe try getting good?`);
			}
		});
	}

	static coin(message) {
		const coinFlip = ['Heads', 'Tails'];
		const coinFlipResponse = random.pick(coinFlip);
		message.channel.sendMessage(coinFlipResponse);
	}

	static chunkSend(payload, channel) {
		console.log('chunking payload...');
		console.log(payload);
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
			console.log(`chunk: ${chunk}`);
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
