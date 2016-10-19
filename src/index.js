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
            this.tryMe(() => {
                msg.messageHandler(message, this.bot, this.commands)
            });
        });

        this.bot.on('voiceStateUpdate', (oldUser, newUser) => {
            this.tryMe(() => {
                player.introSounds(newUser.voiceChannel, newUser, this.intro);
            });
        });
    }

    setDefaultCommands() {
        this.commands.set(new RegExp(this.triggerPrefix + 'help', 'i'), ['function',
            msg.displayCommands
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
            msg.letsPlay
        ]);
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