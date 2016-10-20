const fs = require('fs');
const Database = require('./db.js');

class File {
  static readSoundFiles(callback) {
    console.log('Loading sounds...');

    Database.loadMany('sounds', (sounds) => {
      const newCommands = [];
      fs.readdir('./sounds', {}, (err, files) => {
        const commands = new Map();
        files.forEach((element) => {
          const cmd = element.split('.')[0];
          if (cmd) {
            const reg = new RegExp(`!${cmd}`, 'i');
            commands.set(reg, ['sound', element]);

            const doesSoundExistsInStore = File.containsObject({ sound: cmd }, sounds);

            if (!doesSoundExistsInStore) {
              newCommands.push({ sound: cmd });
            }
          }
        });
        if(newCommands.length > 0) {
          Database.saveMany('sounds', newCommands);
        }
        console.log(`Completed loading ${files.length} files!`);
        callback({ commands, newCommands });
      });
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
