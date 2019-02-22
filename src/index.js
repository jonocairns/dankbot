require('dotenv').config();
const Discord = require('discord.js');
const config = require('./config.json');
const Logger = require('./lib/logger.js');
const Player = require('./lib/player.js');
const File = require('./lib/file.js');
const Message = require('./lib/message.js');
const Clear = require('./lib/clear.js');
const Help = require('./lib/help.js');
const LocalDevConfig = require('../env.json');

class Dank {
	constructor(player, message, bot) {
		this.stats = {};
		this.savedTts = [];
		this.intro = [];
		this.commands = new Map();

		this.player = player;
		this.msg = message;
		this.bot = bot;
	}

	init() {
		let token = process.env.DISCORD_BOT_TOKEN;
		if (!process.env.DISCORD_BOT_TOKEN) {
			token = LocalDevConfig.token;
		}

		if (process.env.HEROKU_APP_NAME && process.env.HEROKU_APP_NAME.indexOf('pr') !== -1) {
			token = process.env.STAGING_DISCORD_BOT_TOKEN;
		}

		this.bot.login(token);
		this.triggerPrefix = `${config.commandTrigger}${config.botPrefix} `;
		this.setDefaultCommands();
		this.setEventHandlers();
		File.readSoundFiles((cmdObj) => {
			this.commands = new Map([...cmdObj.commands, ...this.commands]);
		});
	}

	setEventHandlers() {
		this.bot.on('ready', () => {
			console.log(`Bot has started, with ${this.bot.users.size} users, in ${this.bot.channels.size} channels of ${this.bot.guilds.size} guilds.`);
			console.log('Listing guilds...');
			this.bot.guilds.array().forEach(g => console.log(g.name));
			console.log('End of guild list.');
		});


		this.bot.on('error', (e) => {
			Logger.logError(e);
		});

		this.bot.on('message', (message) => {
			console.log('message recieved');
			Dank.tryMe(() => {
				Message.messageHandler(message, this.bot, this.commands);
			});
		});
	}

	setDefaultCommands() {
		this.commands.set(`${this.triggerPrefix}help`, ['function',
			Help.displayCommands,
		]);
		this.commands.set(`${this.triggerPrefix}exit`, ['function',
			Dank.leaveVoiceChannel,
		]);
		this.commands.set(`${this.triggerPrefix}clear`, ['function',
			Clear.purge,
		]);
		this.commands.set(`${config.commandTrigger}yt`, ['function',
			Player.playYt,
		]);
		this.commands.set(`${config.commandTrigger}meme`, ['function',
			Player.playRandomSound.bind(this),
		]);
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
}

(() => {
	const dank = new Dank(new Player(), new Message(), new Discord.Client({ autoReconnect: true }));

	dank.init();
})();
