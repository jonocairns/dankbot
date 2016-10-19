'use strict';
const fs = require('fs');
const config = require('../config.json');
const Logger = require('./logger.js');

class Tts {
    constructor() {
        this.logger = new Logger();
    }

     saveTts(message, commands) {
        // cmd will be !bot tts "content" cmd
        try {
            var reg = new RegExp();
            // get the "content" inside double quotes
            var content = message.content.match(/"(.*?)"/)[0];
            if(content.length === 0) {
                message.channel.sendMessage('Do it properly.');
                return;
            }
            // remove quotes
            let replaced = content.replace('"', '').replace('"', '');
            // find the last quote and get the index of the next character
            var indexOfLastQuote = message.content.lastIndexOf('"') + 1;
            // get the final parameter (from the last index of the quote to the end of the string)
            var localCmd = message.content.substr(indexOfLastQuote);
            // remove any spaces
            var splitCmd = localCmd.replace(/ /g,'');
            // replace the ! prefix if it's there
            splitCmd = splitCmd.replace('!', '');
            
            // check if the commant already exists
            var cmdExists = false;
            commands.forEach((fileName, command) => {
                let test = '!' + splitCmd;
                if(test.match(command)) {
                    cmdExists = true;
                }
            });

            if(content.length && indexOfLastQuote !== -1 && !cmdExists) {
                var obj = {
                    content: replaced,
                    cmd: splitCmd
                };
                savedTts.push(obj);
                fs.writeFile(config.ttsFileName, JSON.stringify(savedTts));
                var reg = new RegExp(`!${obj.cmd}`, 'i');
                commands.set(reg, ['text', obj.content]);
            }

            if(cmdExists) {
                message.channel.sendMessage('That command already exists you dickface.');
            }
        } catch(err) {
            logger.logError(err, 'fail');
            message.channel.sendMessage('Something bad happened. Try again niggah. use (exclamation)bot tts "some text" (exclamation)bind');
        }
    }
}


module.exports = Tts;