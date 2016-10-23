const config = require('../config.json');
const Player = require('./player.js');
const urban = require('urban');
const omdb = require('omdb');
const random = require('random-js')();
const giphy = require('giphy-api')(process.env.GIPHY_KEY || 'dc6zaTOxFJmzC');

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
		const query = message.content.split(' ').slice(1).join(' ');

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

					const imdbRatingStars = parseInt(movie.imdb.rating, 10);
					let stars = '';
					for (let i = 0; i < imdbRatingStars; i += 1) {
						stars += ':star:';
					}

					const imdbString = `**IMDB**: (${movie.imdb.rating}/10)`;
					const nl = '\r\n';
					const actors = movie.actors.join(', ');
					const genres = movie.genres.join(', ');
					const movieMsg = `:movie_camera:${nl}${nl} **${movie.title}** (${movie.year}) ${stars}${nl}${movie.imdb.rating ? imdbString : ''}${nl}**Link**: http://www.imdb.com/title/${movie.imdb.id}/${nl}**Director**: ${movie.director}${nl}**Actors**: ${actors}${nl}**Genres**: ${genres}${nl}${nl}**Plot**: ${movie.plot}`;
					if (movie.poster) {
						message.channel.sendFile(movie.poster, 'poster.jpg', movieMsg);
					} else {
						message.channel.sendMessage(movieMsg);
					}
				});
			}
		});
	}

	static urbanDictionary(message) {
		const contents = message.content.split(' ').slice(1).join(' ');

		const res = urban(contents);

		res.first((payload) => {
			console.log(`urban dictionary query returned for ${contents}. Payload: ${payload}`);
			if (payload && payload.definition) {
				console.log(payload.definition);
				if (payload.definition.length > 2000) {
					const def = `${contents}: ${payload.definition}`;
					const chunky = def.split(' ');
					Message.chunkSend(chunky, message.channel);
				} else {
					message.channel.sendTTSMessage(`${contents}: ${payload.definition}`);
				}
			} else {
				message.channel.sendMessage(`I couldn't fucking find any results for '${contents}'. Maybe try getting good?`);
			}
		});
	}

	static giphy(message) {
		const contents = message.content.split(' ');
		const keywords = contents.slice(1).join(' ');

		if (contents.length === 1) {
			console.log('Attempting random giphy search');
			giphy.random({ limit: 1, rating: 'r' })
			.then((results) => {
				if (results && results.data) {
					const url = `https://media.giphy.com/media/${results.data.id}/giphy.gif`;
					console.log(`Got url from giphy ${url}`);
					message.channel.sendFile(url);
				} else {
					message.channel.sendMessage('Fuck.');
				}
			}).catch(console.log);
		} else {
			console.log(`Attempting to get gif for ${keywords}...`);
			giphy.translate({ s: keywords, limit: 1, rating: 'r' })
			.then((results) => {
				if (results && results.data) {
					const url = `https://media.giphy.com/media/${results.data.id}/giphy.gif`;
					console.log(`Got url from giphy ${url}`);
					message.channel.sendFile(url);
				} else {
					message.channel.sendMessage('I don\'t know what you searched but it was fucking retarded and therefore had zero results.');
				}
			}).catch(console.log);
		}
	}

	static coin(message) {
		const coinFlip = ['Heads', 'Tails'];
		const coinFlipResponse = random.pick(coinFlip);
		message.channel.sendMessage(coinFlipResponse);
	}

	static chunkSend(payload, channel) {
		console.log('chunking payload...');
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
