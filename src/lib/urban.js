const urban = require('urban');
const Message = require('./message.js');

class Urban {
	static query(message) {
		const mer = message.content.split(' ');
		const contents = mer.slice(1).join(' ');
		let res;
		if (mer.length === 1) {
			res = urban.random();
		} else {
			res = urban(contents);
		}

		res.first((payload) => {
			console.log(`urban dictionary query returned for ${contents}. Payload: ${payload}`);
			if (payload && payload.definition) {
				console.log(payload.definition);
				if (payload.definition.length > 2000) {
					const def = `${contents}: ${payload.definition}`;
					Message.chunkSend(def, message.channel);
				} else {
					message.channel.sendMessage(`${contents}: ${payload.definition}`);
				}
			} else {
				message.channel.sendMessage(`I couldn't fucking find any results for '${contents}'. Maybe try getting good?`);
			}
		});
	}
}

module.exports = Urban;
