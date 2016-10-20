const fs = require('fs');

class File {
  readSoundFiles(callback) {
    console.log('Loading sounds...');
    fs.readdir('./sounds', {}, (err, files) => {
      const commands = new Map();
      files.forEach((element) => {
        const cmd = element.split('.')[0];
        if (cmd) {
          const reg = new RegExp(`!${cmd}`, 'i');
          commands.set(reg, ['sound', element]);
        }
      });
      console.log(`Completed loading ${files.length} files!`);
      callback(commands);
    });
  }
}

module.exports = File;
