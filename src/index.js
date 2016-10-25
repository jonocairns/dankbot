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
const LocalDevConfig = require('../env.json');
const Promise = require('promise');
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
		this.commands.set(new RegExp(`${this.triggerPrefix}auth`, 'i'), ['function',
            Message.getInviteLink,
        ]);
		this.commands.set(new RegExp('!ud', 'i'), ['function',
            Message.urbanDictionary,
        ]);
		this.commands.set(new RegExp('!imdb', 'i'), ['function',
            Message.omdb,
        ]);
		this.commands.set(new RegExp('!coin', 'i'), ['function',
            Message.coin,
        ]);
		this.commands.set(new RegExp('!gif', 'i'), ['function',
            Message.giphy,
        ]);
		this.commands.set(new RegExp('!mama', 'i'), ['function',
            Message.yomama,
        ]);
		this.commands.set(new RegExp('!hltv', 'i'), ['function',
            Message.currentGames,
        ]);
		this.commands.set(new RegExp('!spell', 'i'), ['function',
			(message) => {
				const spellerMessage = Speller.analyze(message.content);

				message.channel.sendMessage(spellerMessage);
			},
        ]);
		this.commands.set(new RegExp('!clear', 'i'), ['function',
            Dank.clear,
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
	}

	static clear(message) {
		const splitty = message.content.split(' ');
		let numberToPurge = 10;

		if (!message.member.hasPermission('MANAGE_MESSAGES')) {
			message.channel.sendMessage('Fuck off and check your privilege.');
			return;
		}
		if (splitty.length > 1) {
			numberToPurge = message.content.split(' ')[1];
			const isNumber = !isNaN(parseFloat(numberToPurge)) && isFinite(numberToPurge);
			if (!isNumber) {
				message.channel.sendMessage('Supply a fucking proper number you fuck.');
				return;
			}
			numberToPurge = parseInt(numberToPurge, 10);
		}

		message.channel.sendMessage('Cleanup on aisle five...').then((ms) => {
			ms.delete(1000).then(() => {
				message.channel.fetchMessages({ limit: numberToPurge }).then((messagesToDelete) => {
					const messagePromises = messagesToDelete.deleteAll();
					Promise.all(messagePromises).then(() => {
						message.channel.sendMessage('RIP in peace sweet prince...').then((s) => {
							s.delete(1000);
						});
					}).catch((e) => {
						message.channel.sendMessage(':face_palm: I might not have the right permissions to do that m8ty.');
						console.log(e);
					});
				});
			});
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
	const dank = new Dank(new Player(), new Message(), new Discord.Client({ autoReconnect: true }));

	dank.init();
})();
