const request = require('request');
const LocalDevConfig = require('../../env.json');

class Twitch {
	static timeSince(date) {
		const seconds = Math.floor((new Date() - date) / 1000);

		let interval = Math.floor(seconds / 31536000);

		if (interval > 1) {
			return `${interval} years`;
		}
		interval = Math.floor(seconds / 2592000);
		if (interval > 1) {
			return `${interval} months`;
		}
		interval = Math.floor(seconds / 86400);
		if (interval > 1) {
			return `${interval} days`;
		}
		interval = Math.floor(seconds / 3600);
		if (interval > 1) {
			return `${interval} hours`;
		}
		interval = Math.floor(seconds / 60);
		if (interval > 1) {
			return `${interval} minutes`;
		}
		return `${Math.floor(seconds)} seconds`;
	}

	static isCurrentlyStreaming(msg) {
		if (!process.env.TWITCH) {
			process.env.TWITCH = LocalDevConfig.twitch;
		}
		const spliter = msg.content.split(' ');

		if (spliter.length === 1) {
			Twitch.topCsgo(msg);
		} else {
			const suffix = spliter.slice(1).join('');
			const url = `https://api.twitch.tv/kraken/streams/${suffix}`;
			request({
				url,
				headers: {
					Accept: 'application/vnd.twitchtv.v3+json',
					'Client-ID': process.env.TWITCH,
				},
			}, (error, response, body) => {
				if (!error && response.statusCode === 200) {
					let resp;
					try {
						resp = JSON.parse(body);
					} catch (e) {
						msg.channel.sendMessage(':anger: Something is fucked. :anger: ');
					}
					if (resp.stream !== null) {
						msg.channel.sendMessage(`:up: **${suffix}** is currently streaming **${resp.stream.game}** with **${resp.stream.viewers}** viewers. :up:\r\n\r\nThe stream has been going for ${Twitch.timeSince(new Date(resp.stream.created_at))}. Check it out here -> <https://www.twitch.tv/${suffix}>`);
					} else if (resp.stream === null) {
						msg.channel.sendMessage(`:no_entry: **${suffix}** is **not** streaming atm. RIP :no_entry: `);
					}
				} else if (!error && response.statusCode === 404) {
					msg.channel.sendMessage(`:busts_in_silhouette: Channel **${suffix}** does not fucking exist :busts_in_silhouette: `);
				}
			});
		}
	}

	static topCsgo(msg) {
		if (!process.env.TWITCH) {
			process.env.TWITCH = LocalDevConfig.twitch;
		}

		const url = 'https://api.twitch.tv/kraken/streams?game=Counter-Strike%3A+Global+Offensive&limit=4';
		request({
			url,
			headers: {
				Accept: 'application/vnd.twitchtv.v3+json',
				'Client-ID': process.env.TWITCH,
			},
		}, (error, response, body) => {
			if (!error && response.statusCode === 200) {
				let resp;
				try {
					resp = JSON.parse(body);
				} catch (e) {
					msg.channel.sendMessage(':anger: Something is fucked. :anger: ');
				}
				let text = `:space_invader: **Counter-Strike: Global Offensive** has ${resp.streams.length} live streams :space_invader: \r\n\r\n`;
				if (resp.streams !== null) {
					resp.streams.forEach((item) => {
						text += `**${item.channel.name}** is streaming with **${item.viewers}** viewers \r\n<${item.channel.url}>\r\n\r\n`;
					});
					msg.channel.sendMessage(text);
				} else if (resp.streams === null) {
					msg.channel.sendMessage(':no_entry: no streams dawg. RIP :no_entry: ');
				}
			} else if (!error && response.statusCode === 404) {
				msg.channel.sendMessage('Nah baw.');
			}
		});
	}
}

module.exports = Twitch;
