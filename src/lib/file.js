'use strict';
const fs = require('fs');
const config = require('../config.json');
const logger = require('./logger.js');

var loadFile = function(fileName, defaultValue, callback) {
    fs.readFile(fileName, 'utf-8', function(error, data) {
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

var incrementSoundStats = function(command, stats) {
    if (stats[command]) {
        stats[command]++;
    } else {
        stats[command] = 1;
    }
    fs.writeFile(config.statsFileName, JSON.stringify(stats));
}

var readSoundFiles = function(callback) {
    console.log('Loading sounds...');
    fs.readdir('./sounds', {}, function(err, files) {
        var commands = new Map();
        files.forEach(function(element, index, array) {
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

module.exports.loadFile = loadFile;
module.exports.readSoundFiles = readSoundFiles;
module.exports.incrementSoundStats = incrementSoundStats;