const Logger = require('./logger.js');
const config = require('../config.json');
const ytdl = require('ytdl-core');

class Player {
	static playSound(message, sound) {
		const authorVoiceChannel = message.member.voiceChannel;
		console.log(`playing sound file for and sound ${sound}...`);
		if (authorVoiceChannel) {
			authorVoiceChannel.join().then((
				connection,
				joinError,
			) => {
				if (joinError) {
					const joinErrorMessage =
                        'Error joining voice channel: ';
					Logger.logError(joinError, joinErrorMessage);
				}
				const dispatcher = connection.playFile(config.soundPath + sound);

				dispatcher.on('error', (err) => {
					Logger.logError(err, `There was an playing the sound ${config.soundPath + sound}`);
					message.delete();
					console.log('playsound errored');
				});
				dispatcher.on('end', () => {
					message.delete();
					console.log('playsound ended');
				});
				return dispatcher;
			}).catch((e) => {
				Logger.trace(`There was an issue joining the channel ${authorVoiceChannel.name}`);
				Logger.logError(e);
			});
		}
	}

	static playRandomSound(message, commands) {
		console.log('random sound');
		const keys = [...commands.keys()];
		let randomKey;
		let randomValue = ['', ''];
		while (randomValue[0] !== 'sound') {
			randomKey = keys[Math.round(keys.length * Math.random())];
			randomValue = commands.get(randomKey);
		}
		Player.playSound(message, randomValue[1]);
	}

	static validateYoutubeUrl(url) {
		const p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
		return (url.match(p));
	}

	static playYt(message) {
		console.log('playing yt...');
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

		
		const streamOptions = { seek: time, volume: vol, filter : 'audioonly' };
		message.member.voiceChannel.join()
			.then((connection) => {
				console.log('Connected to voice channel... Attempting to play video');
				const stream = ytdl(url);

				const dispatcher = connection.playStream(stream, streamOptions);
				
				dispatcher.on("end", end => {
					console.log("yt ended");
					message.delete();
				});

				dispatcher.on("error", end => {
					console.log("yt error");
					message.delete();
				});
				return dispatcher;
			}).catch(console.error);
	}
}
module.exports = Player;
