const fs = require('fs');
const Storage = require('./storage.js');

class File {
	static readFs(callback) {
		fs.readdir('./sounds', {}, (err, files) => {
			const commands = new Map();
			files.forEach((element) => {
				const cmd = element.split('.')[0];
				if (cmd) {
					const reg = `.${cmd}`;
					File.doesAlreadyExists(`.${cmd}`, commands);
					commands.set(reg, ['sound', element]);
				}
			});
			console.log(`Completed loading ${files.length} files!`);
			callback({ commands });
		});
	}

	static readSoundFiles(callback) {
		console.log('Loading sounds...');

		if (fs.existsSync('sounds')) {
			console.log('Loading cached...');
			File.readFs(callback);
		} else {
			console.log('Downloading...');
			Storage.downloadMany('sounds/').then(() => {
				console.log('Completed downloading...');
				File.readFs(callback);
			});
		}
	}

	static doesAlreadyExists(cmd, list) {
		list.forEach((item, regexp) => {
			if (cmd.toLowerCase().startsWith(regexp.toLowerCase())) {
				console.log(`${cmd} already exists and conflicts with the regex ${regexp}. Change the name for it.`);
			}
		});
	}
}


module.exports = File;
