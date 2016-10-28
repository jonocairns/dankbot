const Discord = require('discord.js');
const config = require('./config.json');
const Logger = require('./lib/logger.js');
const Player = require('./lib/player.js');
const File = require('./lib/file.js');
const Tts = require('./lib/tts.js');
const Message = require('./lib/message.js');
const Database = require('./lib/db.js');
const Speller = require('./lib/spellchecker.js');
const Dota = require('./lib/dota.js');
const Clear = require('./lib/clear.js');
const Imdb = require('./lib/imdb.js');
const Urban = require('./lib/urban.js');
const Giphy = require('./lib/giphy.js');
const Hltv = require('./lib/hltv.js');
const Help = require('./lib/help.js');
const Storage = require('./lib/storage.js');
const LocalDevConfig = require('../env.json');
const fml = require('random_fml');
const chuck = require('chuck-norris-api');

class Dank {
	constructor(player, message, bot) {
		this.stats = {};
		this.savedTts = [];
		this.intro = [];
		this.commands = new Map();
		this.newCommands = [];

		this.player = player;
		this.msg = message;
		this.bot = bot;
	}

	init() {
		if (!process.env.DISCORD_BOT_TOKEN) {
			process.env.DISCORD_BOT_TOKEN = LocalDevConfig.token;
		}

		this.bot.login(process.env.DISCORD_BOT_TOKEN);
		this.triggerPrefix = `${config.commandTrigger}${config.botPrefix} `;
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
            Help.displayCommands,
        ]);
		this.commands.set(new RegExp('!meme', 'i'), ['function',
            Player.playRandomSound.bind(this),
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
		this.commands.set(new RegExp(`${this.triggerPrefix}auth`, 'i'), ['function',
            Message.getInviteLink,
        ]);
		this.commands.set(new RegExp('!ud', 'i'), ['function',
            Urban.query,
        ]);
		this.commands.set(new RegExp('!imdb', 'i'), ['function',
            Imdb.query,
        ]);
		this.commands.set(new RegExp('!coin', 'i'), ['function',
            Message.coin,
        ]);
		this.commands.set(new RegExp('!gif', 'i'), ['function',
            Giphy.giphy,
        ]);
		this.commands.set(new RegExp('!mama', 'i'), ['function',
            Message.yomama,
        ]);
		this.commands.set(new RegExp('!hltv', 'i'), ['function',
            Hltv.currentGames,
        ]);
		this.commands.set(new RegExp('!spell', 'i'), ['function',
			(message) => {
				const spellerMessage = Speller.analyze(message.content);

				message.channel.sendMessage(spellerMessage);
			},
        ]);
		this.commands.set(new RegExp('!clear', 'i'), ['function',
            Clear.purge,
        ]);
		this.commands.set(new RegExp('!yt', 'i'), ['function',
            Player.playYt,
        ]);
		this.commands.set(new RegExp('!dota', 'i'), ['function',
			(message) => {
				Dota.currentGames((msg) => {
					message.channel.sendMessage(msg);
				});
			},
        ]);
		this.commands.set(new RegExp('!fml', 'i'), ['function',
			(message) => {
				fml().then(f => message.channel.sendMessage(f));
			},
        ]);
		this.commands.set(new RegExp('!chuck', 'i'), ['function',
			(message) => {
				chuck.getRandom().then(f => message.channel.sendMessage(f.value.joke));
			},
        ]);
		this.commands.set(new RegExp('!addmeme', 'i'), ['function',
			this.add().bind(this),
        ]);
	}

	add(message) {
		const parts = message.content.split(' ');
		const url = parts[2];
		if (parts.length !== 3) {
			message.channel.sendMessage('It should be (!)addmeme memeCommand urlToFile');
			return;
		}

		const cmd = parts[1];
		if (url.split('.')[1] !== 'wav' || url.fileName.split('.')[1] !== 'mp3') {
			message.channel.sendMessage('Not the right fucking file type m8. mp3 or wav only.');
			return;
		}

		const doesAlreadyExist = File.doesAlreadyExists(cmd, this.commands);
		if (doesAlreadyExist) {
			message.channel.sendMessage(`The command ${cmd} already fuckin exists. Change the filename of your fucking attachment to something less retarded.`);
		}

		Storage.upload(url, `${cmd}.${url.split('.')[1]}`, () => {
			console.log(`Adding ${cmd} command...`);
			const reg = new RegExp(`!${cmd}`, 'i');
			this.commands.set(reg, ['sound', cmd]);
		});
	}

	speech(message) {
		const obj = Tts.process(message, this.commands);
		if (!obj.isEmpty) {
			Database.insert('tts', obj, () => {});
			const reg = new RegExp(`!${obj.cmd}`, 'i');
			this.commands.set(reg, ['text', obj.content]);
		}
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
	const dank = new Dank(new Player(), new Message(), new Discord.Client({ autoReconnect: true }));

	dank.init();
})();
