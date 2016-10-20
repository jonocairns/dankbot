const fs = require('fs');

class File {

  static loadFile(fileName, defaultValue, callback) {
    fs.readFile(fileName, 'utf-8', (error, data) => {
      if (error) {
        if (error.code === 'ENOENT') {
          fs.writeFileSync(fileName, JSON.stringify(defaultValue));
        } else {
          console.log('Error: ', error);
        }
        callback(defaultValue);
      } else {
        try {
          const payload = JSON.parse(data);
          callback(payload);
        } catch (parsingError) {
          console.log('Error parsing JSON: ', parsingError);
          callback(defaultValue);
        }
      }
    });
  }

  static readSoundFiles(callback) {
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
