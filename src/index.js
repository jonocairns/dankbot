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
		this.newCommands = [];

		this.player = new Player();
		this.msg = new Message();
	}

	init() {
		this.bot = new Discord.Client({
			autoReconnect: true,
		});
		this.bot.login(process.env.DISCORD_BOT_TOKEN);
		this.triggerPrefix = `${config.commandTrigger + config.botPrefix} `;
		this.setDefaultCommands();
		this.setEventHandlers();
		this.loadFiles();
	}

	loadFiles() {
		File.readSoundFiles((cmdObj) => {
			this.commands = new Map([...cmdObj.commands, ...this.commands]);

			this.newCommands = cmdObj.newCommands.map(a => a.sound);
		});

		this.loadStats();
		this.loadTts();
		this.loadIntros();
	}

	setEventHandlers() {
		this.bot.on('error', (e) => {
			Logger.logError(e);
		});

		this.bot.on('message', (message) => {
			Dank.tryMe(() => {
				if (this.newCommands.length > 0) {
					message.channel.sendMessage(`New dankness added: ${this.newCommands.join(', ')}`);
					this.newCommands = [];
				}
				Message.messageHandler(message, this.bot, this.commands);
			});
		});

		this.bot.on('voiceStateUpdate', (oldUser, newUser) => {
			Dank.tryMe(() => {
				Player.introSounds(newUser.voiceChannel, newUser, this.intro);
			});
		});
	}

	setDefaultCommands() {
		this.commands.set(new RegExp(`${this.triggerPrefix}help`, 'i'), ['function',
            Message.displayCommands,
        ]);
		this.commands.set(new RegExp('!meme', 'i'), ['function',
            Dank.playRandomSound.bind(this),
        ]);
		this.commands.set(new RegExp(`${this.triggerPrefix}tts`, 'i'), ['function',
            this.speech.bind(this),
        ]);
		this.commands.set(new RegExp(`${this.triggerPrefix}exit`, 'i'), ['function',
            Dank.leaveVoiceChannel,
        ]);
		this.commands.set(new RegExp(`${this.triggerPrefix}game`, 'i'), ['function',
            Message.letsPlay,
        ]);
	}

	speech(message) {
		const obj = Tts.process(message, this.commands);
		if (!obj.isEmpty) {
			Database.insert('tts', obj, () => {});
			const reg = new RegExp(`!${obj.cmd}`, 'i');
			this.commands.set(reg, ['text', obj.content]);
		}
	}

	static playRandomSound(message, commands) {
		const keys = [...commands.keys()];
		let randomKey;
		let randomValue = ['', ''];
		while (randomValue[0] !== 'sound') {
			randomKey = keys[Math.round(keys.length * Math.random())];
			randomValue = commands.get(randomKey);
		}
		Player.playSound(message.member.voiceChannel, randomKey.toString().split('/')[1], randomValue[1]);
	}

	static tryMe(fn, msg) {
		let errorMessage = msg;
		if (!errorMessage) {
			errorMessage = '';
		}
		try {
			fn();
		} catch (error) {
			Logger.logError(error, `an unhandled exception occured. ${errorMessage}`);
		}
	}

	static leaveVoiceChannel(message) {
		if (message.member.voiceChannel) {
			message.member.voiceChannel.leave();
		}
	}

	loadStats() {
		Database.loadMany('stats', (data) => {
			this.stats = data;
		});
	}

	loadIntros() {
		Database.loadMany('intros', (data) => {
			this.intro = data;
		});
	}

	loadTts() {
		console.log('Loading tts commands...');

		Database.loadMany('tts', (data) => {
			this.savedTts = data;
			this.savedTts.forEach((element) => {
				const reg = new RegExp(`!${element.cmd}`, 'i');
				this.commands.set(reg, ['text', element.content]);
			});
			if (this.savedTts.length > 0) {
				console.log(`Completed loading ${this.savedTts.length} tts command(s)`);
			} else {
				console.log('There are currently no stored tts commands.');
			}
		});
	}
}

(() => {
	const dank = new Dank();

	dank.init();
})();
