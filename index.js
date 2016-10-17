'use strict';
const fs = require('fs');
const config = require('./config.json');
const intro = require('./intro.json');
const logger = require('./logger.js');
const file = require('./file.js');
const Discord = require('discord.js');
const bot = new Discord.Client({
    autoReconnect: true
});
const triggerPrefix = config.commandTrigger + config.botPrefix + ' ';

var stats;
var savedTts;
var commands = new Map();
var firstConnect = true;

commands.set(new RegExp(triggerPrefix + 'help', 'i'), ['function',
    displayCommands
]);
commands.set(new RegExp(triggerPrefix + 'random', 'i'), ['function',
    playRandomSound
]);
commands.set(new RegExp(triggerPrefix + 'popular', 'i'), ['function',
    sendPopularCommands
]);
commands.set(new RegExp(triggerPrefix + 'tts', 'i'), ['function',
    saveTts
]);
commands.set(new RegExp(triggerPrefix + 'exit', 'i'), ['function',
    leaveVoiceChannel
]);

function fileToCommand(file) {
    return config.commandTrigger + file.split('.')[0].split('-').join(' ');
}

function regExpToCommand(command) {
    return command.toString().split('/')[1];
}

function addSoundsTo(map, fromDirectoryPath) {
    var soundFiles = fs.readdir(fromDirectoryPath, function(err, files) {
        files.forEach(function(file) {
            if (file[0] !== '.') {
                var command = fileToCommand(file);
                var commandRegExp = new RegExp(command, 'i');
                map.set(commandRegExp, ['sound', file]);
            }
        });
    });
}

function tryMe(fn, msg) {
    if (!msg) {
        msg = '';
    }
    try {
        fn();
    } catch (error) {
        logger.logError(error, `an unhandled exception occured. ${msg}`);
    }
}

function sendMessage(authorChannel, text) {
    bot.sendTTSMessage(authorChannel, text);
}

function leaveVoiceChannel(message) {
    if (bot.voiceConnections.get('server', message.server)) {
        bot.voiceConnections.get('server', message.server).destroy();
    }
}

function playSound(authorChannel, authorVoiceChannel, command, sound) {
    console.log('inside playSound');
    console.log(authorVoiceChannel);
    if (authorVoiceChannel) {
        console.log('inside authorVoiceChannel');
        authorVoiceChannel.join().then(function(connection,
            joinError) {
                console.log('inside join channel');
            if (joinError) {
                var joinErrorMessage =
                    'Error joining voice channel: ';
                logger.logError(joinError, joinErrorMessage);
                authorChannel.sendMessage(authorChannel, joinErrorMessage +
                    joinError);
            }
            const dispatcher = connection.playFile(config.soundPath + sound).then(
                function(intent) {
                    intent.on('error', function(streamError) {
                        var streamErrorMessage =
                            'Error streaming sound file: ';
                        logger.logError(streamError, streamErrorMessage);
                        authorChannel.sendMessage(authorChannel,
                            streamErrorMessage +
                            streamError);
                     });
                    file.incrementSoundStats(command, stats);
                    if (config.autoLeaveVoice) {
                        intent.on('end', function() {
                            connection.destroy();
                        });
                    }
                }).catch(function() {
                logger.trace(
                    `There was an issue attempting to play the file ${sound}`
                );
            });
        }).catch(function() {
            logger.trace(
                `There was an issue joining the channel ${authorVoiceChannel.name} to play the command ${command}`
            );
        });
    }
}

function saveTts(message) {
    // cmd will be !bot tts "content" cmd
    try {
        var reg = new RegExp();
        // get the "content" inside double quotes
        var content = message.content.match(/"(.*?)"/)[0];
        if(content.length === 0) {
            message.channel.sendMessage(message.channel, 'Do it properly.');
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
        commands.forEach(function(fileName, command) {
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
            message.channel.sendMessage(message.channel, 'That command already exists you dickface.');
        }
    } catch(err) {
        logger.logError(err, 'fail');
        message.channel.sendMessage(message.channel, 'Something bad happened. Try again niggah. use (exclamation)bot tts "some text" (exclamation)bindtouse');
    }
    
}

function sendPopularCommands(message) {
    var total = 0;
    var statsArray = [];
    var popularMessage = '';
    for (var key in stats) {
        if (stats.hasOwnProperty(key)) {
            statsArray.push([key, stats[key]]);
            total += stats[key];
        }
    }
    statsArray.sort(function(a, b) {
        return b[1] - a[1];
    });
    var i = 0;
    while (i < statsArray.length && i < 5) {
        popularMessage += statsArray[i][0] + ' — ' + Math.round((statsArray[
            i][1] / total) * 100) + '%\n';
        i++;
    }
    message.channel.sendMessage(message.channel, popularMessage);
}

function playRandomSound(message) {
    var keys = [...commands.keys()];
    var randomKey;
    var randomValue = ['', ''];
    while (randomValue[0] !== 'sound') {
        randomKey = keys[Math.round(keys.length * Math.random())];
        randomValue = commands.get(randomKey);
    }
    playSound(message.channel, message.author.voiceChannel, regExpToCommand(
        randomKey), randomValue[1]);
}

function isUserBanned(username) {
    var banlist = config.banList.split(',');
    var isBanned = false;
    banlist.forEach(function(bannedUsername) {
        if (bannedUsername === username) {
            isBanned = true;
        }
    });
    return isBanned;
}

function displayCommands(message) {
    var helpMessage = '';
    if (message.content.split(' ')[2]) {
        var helpFilter = new RegExp(message.content.split(' ')[2], 'i');
        commands.forEach(function(fileName, command) {
            if (command.toString().match(helpFilter)) {
                helpMessage += regExpToCommand(command) + '\n';
            }
        });
    } else {
        commands.forEach(function(fileName, command) {
            helpMessage += regExpToCommand(command) + '\n';
        });
    }
    message.channel.sendMessage(message.channel, helpMessage);
}

function messageHandler(message) {
    firstConnect = false;
    if (message.author.username !== bot.user.username && !isUserBanned(
        message.author.username)) {
        commands.forEach(function(botReply, regexp) {
            if (message.content.match(regexp)) {
                switch (botReply[0]) {
                    case 'function':
                        botReply[1](message);
                        message.delete();
                        break;
                    case 'sound':
                        console.log('playing sound');
                        playSound(message.channel, message.member.voiceChannel,
                            regExpToCommand(regexp), botReply[1]
                        );
                        message.delete();
                        break;
                    case 'text':
                        sendMessage(message.channel, botReply[1]);
                        message.delete();
                        break;
                    default:
                        break;
                }
            }
        });
    }
}

function introSounds(newChannel, user) {
    var messageChannel = bot.channels.get("name", "hashfag");
    if (user.status === 'online') {

        intro.forEach(function(element, index, array) {
            if (user.username === element.user) {
                let cmd = `!${element.sound}`;
                let fileName = `${element.sound}.${element.ext}`;
                playSound(messageChannel, newChannel, cmd, fileName);
            }
        });
    }
}

bot.on('message', function(message) {
    tryMe(function() {
        messageHandler(message)
    });
});

bot.on('voiceJoin', function(channel, user) {
    tryMe(function() {
        if (!firstConnect) {
            tryMe(function() {
                introSounds(channel, user)
            });
        }
    })
});
bot.on('voiceSwitch', function(oldChannel, newChannel, user) {
    tryMe(function() {
        introSounds(newChannel, user)
    });
});

function loadStatsFile() {
    file.loadFile(config.statsFileName, {}, function(data) {
        stats = data;
    });
}

function loadTtsFile() {
    console.log(`Loading tts commands...`);
    file.loadFile(config.ttsFileName, [], function(data){
        savedTts = data;
        savedTts.forEach(function(element, index, array) {
            var reg = new RegExp(`!${element.cmd}`, 'i');
            commands.set(reg, ['text', element.content]);
        });
        if(savedTts.length > 0) {
            console.log(`Completed loading ${savedTts.length} tts command(s)`);
        } else {
            console.log(`There are currently no stored tts commands.`);
        }
    });
}

(function init() {
    //bot.on("debug", (m) => console.log("[debug]", m));
    //bot.on("warn", (m) => console.log("[warn]", m));

    bot.on('error', e => {
        logger.logError(e);
    });

    file.readSoundFiles(function(cmds) {
        commands = cmds;
        if (config.autoLoadSounds) {
            addSoundsTo(commands, config.soundPath);
        }
    })
    bot.login(config.botToken);
    
    file.loadFile(config.statsFileName, {}, function(data) {
        stats = data;
    });
    loadStatsFile();
    loadTtsFile();
})();