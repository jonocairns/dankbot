const fs = require('fs');
const Database = require('./db.js');
const Storage = require('./storage.js');

class File {
	static readFs(callback, sounds) {
		const newCommands = [];
		fs.readdir('./sounds', {}, (err, files) => {
			const commands = new Map();
			files.forEach((element) => {
				const cmd = element.split('.')[0];
				if (cmd) {
					const reg = `.${cmd}`;
					File.doesAlreadyExists(`.${cmd}`, commands);

					commands.set(reg, ['sound', element]);

					const doesSoundExistsInStore = File.containsObject({ sound: cmd }, sounds);

					if (!doesSoundExistsInStore) {
						newCommands.push({ sound: cmd });
					}
				}
			});
			if (newCommands.length > 0) {
				Database.saveMany('sounds', newCommands);
			}
			console.log(`Completed loading ${files.length} files!`);
			callback({ commands, newCommands });
		});
	}

	static readSoundFiles(callback) {
		console.log('Loading sounds...');

		Database.loadMany('sounds', (sounds) => {
			if (fs.existsSync('sounds/')) {
				File.readFs(callback, sounds);
			} else {
				Storage.downloadMany('sounds/').then(() => {
					File.readFs(callback, sounds);
				});
			}
		});
	}

	static doesAlreadyExists(cmd, list) {
		list.forEach((item, regexp) => {
			if (cmd.toLowerCase().startsWith(regexp.toLowerCase())) {
				console.log(`${cmd} already exists and conflicts with the regex ${regexp}. Change the name for it.`);
			}
		});
	}

	static containsObject(obj, list) {
		let i;
		for (i = 0; i < list.length; i += 1) {
			if (list[i].sound === obj.sound) {
				return true;
			}
		}
		return false;
	}
}

module.exports = File;
