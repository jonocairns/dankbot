const giphy = require('giphy-api')(process.env.GIPHY_KEY || 'dc6zaTOxFJmzC');

class Giphy {
	static giphy(message) {
		const contents = message.content.split(' ');
		const keywords = contents.slice(1).join(' ');

		if (contents.length === 1) {
			console.log('Attempting random giphy search');
			giphy.random({ limit: 1, rating: 'r' })
			.then((results) => {
				if (results && results.data && results.data.id) {
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
				if (results && results.data && results.data.id) {
					const url = `https://media.giphy.com/media/${results.data.id}/giphy.gif`;
					console.log(`Got url from giphy ${url}`);
					message.channel.sendFile(url);
				} else {
					message.channel.sendMessage('I don\'t know what you searched but it was fucking retarded and therefore had zero results.');
				}
			}).catch(console.log);
		}
	}
}

module.exports = Giphy;
