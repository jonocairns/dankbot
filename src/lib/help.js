class Help {
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

		chunks.forEach((chunk) => {
			message.member.sendMessage(chunk);
		});
	}
}

module.exports = Help;
