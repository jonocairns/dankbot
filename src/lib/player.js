const Logger = require('./logger.js');
const config = require('../config.json');
const Database = require('./db.js');
const ytdl = require('ytdl-core');

class Player {

	static playSound(authorVoiceChannel, command, sound) {
		if (authorVoiceChannel) {
			authorVoiceChannel.join().then((connection,
                joinError) => {
				if (joinError) {
					const joinErrorMessage =
                        'Error joining voice channel: ';
					Logger.logError(joinError, joinErrorMessage);
				}
				const dispatcher = connection.playFile(config.soundPath + sound);

				dispatcher.on('error', (err) => {
					Logger.logError(err,
                        `There was an playing the sound ${config.soundPath + sound}`
                    );
				});
				dispatcher.on('end', () => {
					if (config.saveStats) {
						Database.load({ command }, 'stats', (i) => {
							if (i.length === 0) {
								Database.update({ command }, { $setOnInsert: { count: 1 } }, 'stats', () => {
								});
							} else {
								Database.update({ command }, { $inc: { count: 1 } }, 'stats', () => {
								});
							}
						});
					}
				});
			}).catch((e) => {
				Logger.trace(
                    `There was an issue joining the channel ${authorVoiceChannel.name} to play the command ${command}`
                );
				Logger.logError(e);
			});
		}
	}

	static introSounds(newChannel, user, intro) {
		intro.forEach((element) => {
			if (user.user.username === element.user) {
				const cmd = `!${element.sound}`;
				const fileName = `${element.sound}.${element.ext}`;
				Player.playSound(newChannel, cmd, fileName);
			}
		});
	}

	static validateYoutubeUrl(url) {
		const p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
		return (url.match(p));
	}

	static playYt(message) {
		const contents = message.content.split(' ');
		const url = contents[1];

		if (!Player.validateYoutubeUrl(url)) {
			message.channel.sendMessage('Oi, only use youtube urls you cuntface.');
			return;
		}

		let time = 0;
		let vol = 1;
		if (contents.length >= 4) {
			time = contents[2];
		}

		if (contents.length >= 5) {
			vol = contents[3];
		}
		console.log(`Triggered yt play on ${url} with start ${time} and volume ${vol}`);

		const streamOptions = { seek: time, volume: vol };
		message.member.voiceChannel.join()
		.then((connection) => {
			console.log('Connected to voice channel... Attempting to play video');
			const stream = ytdl(url);

			const dispatcher = connection.playStream(stream, streamOptions);
			dispatcher.on('error', err => console.log('Error occured attempting to stream', err));
			// dispatcher.on('debug', console.log);
			// connection.player.on('debug', console.log);
			connection.player.on('error', err => console.log('Connection issue occured', err));
		}).catch(console.log);
		message.delete();
	}
}
module.exports = Player;
