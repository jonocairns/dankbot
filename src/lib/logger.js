class Logger {
	static toJSONLocal(date) {
		const local = new Date(date);
		local.setMinutes(date.getMinutes() - date.getTimezoneOffset());
		return local.toJSON();
	}

	static trace(msg) {
		let message = msg;
		const sep = '--------------------';
		const nl = '\r\n';
		message = `${nl}${sep}${nl}timestamp:${Logger.toJSONLocal(new Date())}${nl}message:${message}${nl}`;
		console.log(message);
	}

	static logError(error, msg) {
		let message = msg;
		const nl = '\r\n';
		const sep = '--------------------';
		message = `message:${message}${nl}`;
		if (!message) {
			message = '';
		}

		message = `${nl}${sep}${nl}timestamp:${Logger.toJSONLocal(new Date())}${nl}name:${error.name}${nl}${message}${error.stack}${nl}${error.message}${nl}${sep}${nl}`;

		Logger.trace(message);
	}
}

module.exports = Logger;

