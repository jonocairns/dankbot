'use strict';
const fs = require('fs');
const config = require('../config.json');
const logger = require('./logger.js');

class File {
    loadFile(fileName, defaultValue, callback) {
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
                    var payload = JSON.parse(data);
                    callback(payload);
                } catch (parsingError) {
                    console.log('Error parsing JSON: ', parsingError);
                    callback(defaultValue);
                }
            }
        });
    }

    incrementSoundStats(command, stats) {
        if (stats[command]) {
            stats[command]++;
        } else {
            stats[command] = 1;
        }
        fs.writeFile(config.statsFileName, JSON.stringify(stats));
    }

    readSoundFiles(callback) {
        console.log('Loading sounds...');
        fs.readdir('./sounds', {}, (err, files) => {
            var commands = new Map();
            files.forEach((element, index, array) => {
                var cmd = element.split('.')[0];
                if (cmd) {
                    var reg = new RegExp(`!${cmd}`, 'i');
                    commands.set(reg, ['sound', element]);
                }
            });
            console.log(`Completed loading ${files.length} files!`);
            callback(commands);
        });
    }
}

module.exports = new File;