'use strict';
const fs = require('fs');
const Discord = require('discord.js');
const config = require('./config.json');
const Logger = require('./lib/logger.js');
const Player = require('./lib/player.js');
const File = require('./lib/file.js');
const Tts = require('./lib/tts.js');
const Message = require('./lib/message.js');
const Database = require('./lib/db.js');

class Dank {
    constructor() {
        this.stats = {};
        this.savedTts = [];
        this.intro = [];
        this.commands = new Map();

        this.logger = new Logger();
        this.player = new Player();
        this.file = new File();
        this.tts = new Tts();
        this.msg = new Message();
        this.db = new Database();
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
        this.file.readSoundFiles((cmds) => {
            this.commands = new Map([...cmds, ...this.commands]);
        });
    
        this.loadStats();
        this.loadTts();
        this.loadIntros();
    }

    setEventHandlers() {
        this.bot.on('error', e => {
            this.logger.logError(e);
        });
        
        this.bot.on('message', (message) => {
            this.tryMe(() => {
                this.msg.messageHandler(message, this.bot, this.commands)
            });
        });

        this.bot.on('voiceStateUpdate', (oldUser, newUser) => {
            this.tryMe(() => {
                this.player.introSounds(newUser.voiceChannel, newUser, this.intro);
            });
        });
    }

    setDefaultCommands() {
        this.commands.set(new RegExp(this.triggerPrefix + 'help', 'i'), ['function',
            this.msg.displayCommands
        ]);
        this.commands.set(new RegExp(this.triggerPrefix + 'random', 'i'), ['function',
            this.playRandomSound.bind(this)
        ]);
        this.commands.set(new RegExp(this.triggerPrefix + 'tts', 'i'), ['function',
            this.speech.bind(this)
        ]);
        this.commands.set(new RegExp(this.triggerPrefix + 'exit', 'i'), ['function',
            this.leaveVoiceChannel
        ]);
        this.commands.set(new RegExp(this.triggerPrefix + 'game', 'i'), ['function',
            this.msg.letsPlay
        ]);
    }

    speech(message) {
        var obj = this.tts.process(message, this.commands);

        if(!obj.isEmpty) {
            this.db.save(obj, 'tts');
            var reg = new RegExp(`!${obj.cmd}`, 'i');
            this.commands.set(reg, ['text', obj.content]);
        }
    }

    playRandomSound(message, commands) {
        var keys = [...commands.keys()];
        var randomKey;
        var randomValue = ['', ''];
        while (randomValue[0] !== 'sound') {
            randomKey = keys[Math.round(keys.length * Math.random())];
            randomValue = commands.get(randomKey);
        }
        this.player.playSound(message.member.voiceChannel, randomKey.toString().split('/')[1], randomValue[1]);
    }

    tryMe(fn, msg) {
        if (!msg) {
            msg = '';
        }
        try {
            fn();
        } catch (error) {
            this.logger.logError(error, `an unhandled exception occured. ${msg}`);
        }
    }

    leaveVoiceChannel(message) {
        if(message.member.voiceChannel) {
            message.member.voiceChannel.leave();
        }
    }

    loadStats() {
        this.db.loadMany('stats', (data) => {
            this.stats = data;
        });
    }

    loadIntros() {
        this.db.loadMany('tts', (data) => {
            this.intro = data;
        });
    }

    loadTts() {
        console.log(`Loading tts commands...`);

        this.db.loadMany('tts', (data) => {
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