const Promise = require('promise');

class Clear {

	static purge(message) {
		const splitty = message.content.split(' ');
		let numberToPurge = 10;

		if (!message.member.hasPermission('MANAGE_MESSAGES')) {
			message.channel.sendMessage('Fuck off and check your privilege.');
			return;
		}
		if (splitty.length > 1) {
			numberToPurge = message.content.split(' ')[1];
			const isNumber = !isNaN(parseFloat(numberToPurge)) && isFinite(numberToPurge);
			if (!isNumber) {
				message.channel.sendMessage('Supply a fucking proper number you fuck.');
				return;
			}
			numberToPurge = parseInt(numberToPurge, 10);
		}

		message.channel.sendMessage('Cleanup on aisle five...').then((ms) => {
			ms.delete(1000).then(() => {
				message.channel.fetchMessages({ limit: numberToPurge }).then((messagesToDelete) => {
					const messagePromises = messagesToDelete.deleteAll();
					Promise.all(messagePromises).then(() => {
						message.channel.sendMessage('RIP in peace sweet prince...').then((s) => {
							s.delete(1000);
						});
					}).catch((e) => {
						message.channel.sendMessage(':face_palm: I might not have the right permissions to do that m8ty.');
						console.log(e);
					});
				});
			});
		});
	}
}

module.exports = Clear;
