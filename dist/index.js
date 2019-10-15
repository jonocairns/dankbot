"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var discord_js_1 = __importDefault(require("discord.js"));
var dotenv_1 = __importDefault(require("dotenv"));
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
var client = new discord_js_1.default.Client();
var sounds = [];
fs_1.default.readdir(path_1.default.join(__dirname, '../sounds'), function (err, files) {
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    }
    files.forEach(function (file) { return sounds.push(file); });
});
client.on('ready', function () {
    console.log("Logged in as " + client.user.tag + "!");
});
client.on('message', function (msg) {
    if (!msg.content.startsWith('.'))
        return;
    if (!msg.guild)
        return;
    if (msg.member.voiceChannel) {
        msg.member.voiceChannel.join()
            .then(function (connection) {
            var targetFile = msg.content.split('.').pop();
            if (targetFile === 'leave') {
                msg.member.voiceChannel.leave();
            }
            if (targetFile === 'meme') {
                targetFile = sounds[Math.floor(Math.random() * sounds.length)].split('.').shift();
            }
            var file = sounds.find(function (s) { return s.split('.').shift() === targetFile; });
            if (file) {
                var dispatcher = connection.playFile(path_1.default.join(__dirname, "../sounds/" + file));
                dispatcher.on('end', function () {
                    msg.delete();
                });
                dispatcher.on('error', function (e) {
                    console.log(e);
                });
            }
        })
            .catch(console.log);
    }
    else {
        msg.reply('You need to join a voice channel first!');
    }
});
client.login(process.env.DISCORD_BOT_TOKEN);
//# sourceMappingURL=index.js.map