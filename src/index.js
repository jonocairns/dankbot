'use strict';
const fs = require('fs');
const Discord = require('discord.js');
const config = require('./config.json');
const logger = require('./lib/logger.js');
const player = require('./lib/player.js');
const file = require('./lib/file.js');
const tts = require('./lib/tts.js');
const msg = require('./lib/message.js');

class Dank {
    constructor() {
        this.stats = {};
        this.savedTts = [];
        this.intro = [];
        this.commands = new Map();
    }

    init() {
        this.bot = new Discord.Client({
            autoReconnect: true
        });
        this.bot.login(config.botToken);
        this.triggerPrefix = config.commandTrigger + config.botPrefix + ' ';
        this.setDefaultCommands();
        this.setEventHandlers();
        this.loadFiles();
    }

    loadFiles() {
        file.readSoundFiles((cmds) => {
            this.commands = new Map([...cmds, ...this.commands]);

            if (config.autoLoadSounds) {
                this.addSoundsTo(commands, config.soundPath);
            }
        });
    
        file.loadFile(config.statsFileName, {}, (data) => {
            this.stats = data;
        });
        this.loadStatsFile();
        this.loadTtsFile();
        this.loadIntros();
    }

    setEventHandlers() {
        this.bot.on('error', e => {
            logger.logError(e);
        });
        
        this.bot.on('message', (message) => {
            tryMe(() => {
                msg.messageHandler(message, bot, commands)
            });
        });

        this.bot.on('voiceStateUpdate', (oldUser, newUser) => {
            tryMe(() => {
                player.introSounds(newUser.voiceChannel, newUser, intro);
            });
        });
    }

    setDefaultCommands() {
        this.commands.set(new RegExp(this.triggerPrefix + 'help', 'i'), ['function',
            this.displayCommands
        ]);
        this.commands.set(new RegExp(this.triggerPrefix + 'random', 'i'), ['function',
            player.playRandomSound
        ]);
        this.commands.set(new RegExp(this.triggerPrefix + 'tts', 'i'), ['function',
            tts.saveTts
        ]);
        this.commands.set(new RegExp(this.triggerPrefix + 'exit', 'i'), ['function',
            this.leaveVoiceChannel
        ]);
        this.commands.set(new RegExp(this.triggerPrefix + 'game', 'i'), ['function',
            this.letsPlay
        ]);
    }

    letsPlay(message) {
        message.channel.sendTTSMessage(`It's time for some cs boys. Chairs boys.`);

        let usersNamesOnline = [];
        bot.users.forEach((user) =>{
            if(user.status === 'online') {
                usersNamesOnline.push(user.username);
                user.sendMessage(`Keen for cs?`);
            }
        });

        let usersOnline = usersNamesOnline.join(', ')

        message.channel.sendMessage(`The number of fgts online is ${usersNamesOnline.length}. ${usersOnline}`);
    }

    displayCommands(message) {
        var helpMessage = '';
        if (message.content.split(' ')[2]) {
            var helpFilter = new RegExp(message.content.split(' ')[2], 'i');
            this.commands.forEach((fileName, command) => {
                if (command.toString().match(helpFilter)) {
                    helpMessage += msg.regExpToCommand(command) + ', ';
                }
            });
        } else {
            this.commands.forEach((fileName, command) => {
                helpMessage += msg.regExpToCommand(command) + ', ';
            });
        }
        message.member.sendMessage(helpMessage);
    }

    addSoundsTo(map, fromDirectoryPath) {
        fs.readdir(fromDirectoryPath, (err, files) => {
            this.files.forEach((file) => {
                if (file[0] !== '.') {
                    var command = config.commandTrigger + file.split('.')[0].split('-').join(' ');
                    var commandRegExp = new RegExp(command, 'i');
                    map.set(commandRegExp, ['sound', file]);
                }
            });
        });
    }

    tryMe(fn, msg) {
        if (!msg) {
            msg = '';
        }
        try {
            fn();
        } catch (error) {
            logger.logError(error, `an unhandled exception occured. ${msg}`);
        }
    }

    leaveVoiceChannel(message) {
        if (this.bot.voiceConnections.get('server', message.server)) {
            this.bot.voiceConnections.get('server', message.server).destroy();
        }
    }

    loadStatsFile() {
        file.loadFile(config.statsFileName, {}, (data) => {
            this.stats = data;
        });
    }

    loadIntros() {
        file.loadFile(config.introFileName, [], (data) => {
            this.intro = data;
        });
    }

    loadTtsFile() {
        console.log(`Loading tts commands...`);
        file.loadFile(config.ttsFileName, [], (data) => {
            this.savedTts = data;
            this.savedTts.forEach((element, index, array) => {
                let reg = new RegExp(`!${element.cmd}`, 'i');
                this.commands.set(reg, ['text', element.content]);
            });
            if(this.savedTts.length > 0) {
                console.log(`Completed loading ${this.savedTts.length} tts command(s)`);
            } else {
                console.log(`There are currently no stored tts commands.`);
            }
        });
    }
}

(() => {
    const dank = new Dank();

    dank.init();
})()