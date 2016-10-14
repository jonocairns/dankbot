'use strict';

var fs = require('fs');
var config = require('./config.json');
var Discord = require('discord.js');
var bot = new Discord.Client({ autoReconnect: true });

var stats;
var commands = new Map();
var triggerPrefix = config.commandTrigger + config.botPrefix + ' ';
commands.set(new RegExp(triggerPrefix + 'help', 'i'), ['function', displayCommands]);
commands.set(new RegExp(triggerPrefix + 'random', 'i'), ['function', playRandomSound]);
commands.set(new RegExp(triggerPrefix + 'popular', 'i'), ['function', sendPopularCommands]);
commands.set(new RegExp(triggerPrefix + 'exit', 'i'), ['function', leaveVoiceChannel]);
if(config.demoMode) {
  commands.set(/!liftoff/i, ['text', 'Hey look at me, I can suck my own Dee']);
  commands.set(/!chairs/i, ['text', 'boys']);
  commands.set(/!toby/i, ['text', 'Quality questions create a quality life. Successful people ask better questions, and as a result, they get better answers.']);
  commands.set(/!wabbins/i, ['text', 'CREATE A VISION AND NEVER LET THE ENVIRONMENT, OTHER PEOPLE’S BELIEFS, OR THE LIMITS OF WHAT HAS BEEN DONE IN THE PAST SHAPE YOUR DECISIONS.']);
  commands.set(/!tony/i, ['text', 'A real decision is measured by the fact that you’ve taken a new action. If there’s no action, you haven’t truly decided.']);

  commands.set(/!crains/i, ['text', 'I will lift your spirits with my big black cock']);
  commands.set(/!bekfast/i, ['sound', 'bekfast-short.mp3']);
  commands.set(/!bfstlong/i, ['sound', 'bekfast-long.mp3']);
  commands.set(/!sad/i, ['sound', '2sad4me.mp3']);
  commands.set(/!horn/i, ['sound', 'airhorn.mp3']);
  commands.set(/!say/i, ['sound', 'watchasay.mp3']);
  commands.set(/!weed/i, ['sound', 'weed.mp3']);
  commands.set(/!wow/i, ['sound', 'wow.mp3']);
  commands.set(/!ross/i, ['sound', 'ross.mp3']);
  commands.set(/!turndown/i, ['sound', 'turndown.mp3']);
  commands.set(/!spooky/i, ['sound', 'spooky.mp3']);
  commands.set(/!dedotaded/i, ['sound', 'dedotaded.mp3']);
  commands.set(/!camera/i, ['sound', 'camera.mp3']);
  commands.set(/!never/i, ['sound', 'never.mp3']);
  commands.set(/!tripple/i, ['sound', 'tripple.mp3']);
  commands.set(/!reese/i, ['sound', 'fart.wav']);
  commands.set(/!wololo/i, ['sound', 'wololo.mp3']);
  commands.set(/!vuvuzela/i, ['sound', 'vuvuzela.mp3']);
  commands.set(/!prep/i, ['sound', 'prep.mp3']);
  commands.set(/!haha/i, ['sound', 'haha.mp3']);
  commands.set(/!muhaha/i, ['sound', 'muhaha.mp3']);
  commands.set(/!hadouken/i, ['sound', 'hadouken.mp3']);
  commands.set(/!fuckoff/i, ['sound', 'fuckoff.mp3']);
  commands.set(/!ethan/i, ['sound', 'ethan.mp3']);
  commands.set(/!dramatic/i, ['sound', 'dramatic.mp3']);
  commands.set(/!crickets/i, ['sound', 'crickets.mp3']);
  commands.set(/!cough/i, ['sound', 'cough.mp3']);
  commands.set(/!bork/i, ['sound', 'bork.mp3']);
  commands.set(/!whisper/i, ['sound', 'whisper.mp3']);
  commands.set(/!hitler/i, ['sound', 'hitler.mp3']);
  commands.set(/!inception/i, ['sound', 'inception.mp3']);

  commands.set(/!nigga/i, ['sound', 'nigga.mp3']);
  commands.set(/!surprise/i, ['sound', 'surprise.mp3']);
  commands.set(/!gayyy/i, ['sound', 'gayyy.mp3']);
  commands.set(/!nobody/i, ['sound', 'nobody.mp3']);
  commands.set(/!cena/i, ['sound', 'cena.mp3']);
  commands.set(/!murloc/i, ['sound', 'murloc.mp3']);
  commands.set(/!turtles/i, ['sound', 'turtles.mp3']);
  commands.set(/!shame/i, ['sound', 'shame.mp3']);
  commands.set(/!love/i, ['sound', 'love.mp3']);
  commands.set(/!allah/i, ['sound', 'allah.mp3']);
  commands.set(/!clap/i, ['sound', 'clap.mp3']);
  commands.set(/!duel/i, ['sound', 'duel.mp3']);
  commands.set(/!suck/i, ['sound', 'suck.mp3']);
  commands.set(/!how/i, ['sound', 'how.mp3']);
  commands.set(/!dwagens/i, ['sound', 'dwagens.m4a']);
  commands.set(/!dwagens1/i, ['sound', 'dwagens1.m4a']);
  commands.set(/!dwagens2/i, ['sound', 'dwagens2.m4a']);

  commands.set(/!rage/i, ['sound', 'rage.mp3']);
  commands.set(/!mynigga/i, ['sound', 'mynigga.mp3']);
  commands.set(/!spin/i, ['sound', 'spin.mp3']);
  commands.set(/!smell/i, ['sound', 'smell.mp3']);
  commands.set(/!choppa/i, ['sound', 'choppa.mp3']);
  commands.set(/!yeahboy/i, ['sound', 'yeahboy.mp3']);
  commands.set(/!money/i, ['sound', 'money.mp3']);
  commands.set(/!epic/i, ['sound', 'epic.mp3']);
  commands.set(/!justdoit/i, ['sound', 'justdoit.mp3']);
  commands.set(/!tralala/i, ['sound', 'tralala.mp3']);
  commands.set(/!yeeah/i, ['sound', 'yeeah.mp3']);
  commands.set(/!boondocks/i, ['sound', 'boondocks.mp3']);
  commands.set(/!shesaid/i, ['sound', 'shesaid.mp3']);
  commands.set(/!men/i, ['sound', 'men.mp3']);
  commands.set(/!gayaf/i, ['sound', 'reese.mp3']);
}
// commands.set(//i, ['', '']);

function incrementSoundStats(command) {
  if(stats[command]) {
    stats[command]++;
  } else {
    stats[command] = 1;
  }
  fs.writeFile(config.statsFileName, JSON.stringify(stats));
}

function loadStatsFile() {
  fs.readFile(config.statsFileName, 'utf-8', function(error, data) {
    if(error) {
      if(error.code === 'ENOENT') {
        fs.writeFileSync(config.statsFileName, JSON.stringify({}));
        stats = {};
      } else {
        console.log('Error: ', error);
      }
    } else {
      try {
        stats = JSON.parse(data);
      } catch(parsingError) {
        console.log('Error parsing JSON: ', parsingError);
      }
    }
  });
}

function fileToCommand(file) {
  return config.commandTrigger + file.split('.')[0].split('-').join(' ');
}

function regExpToCommand(command) {
  return command.toString().split('/')[1];
}

function addSoundsTo(map, fromDirectoryPath) {
  var soundFiles = fs.readdir(fromDirectoryPath, function(err, files) {
    files.forEach(function(file) {
      if(file[0] !== '.') {
        var command = fileToCommand(file);
        var commandRegExp = new RegExp(command, 'i');
        map.set(commandRegExp, ['sound', file]);
      }
    });
  });
}

function sendMessage(authorChannel, text) {
  bot.sendTTSMessage(authorChannel, text);
}

function leaveVoiceChannel(message) {
  if(bot.voiceConnections.get('server', message.server)) {
    bot.voiceConnections.get('server', message.server).destroy();
  }
}

function playSound(authorChannel, authorVoiceChannel, command, sound) {
  bot.joinVoiceChannel(authorVoiceChannel).then(function(connection, joinError) {
    if(joinError) {
      var joinErrorMessage = 'Error joining voice channel: ';
      console.log(joinErrorMessage, joinError);
      bot.sendMessage(authorChannel, joinErrorMessage + joinError);
    }
    connection.playFile(config.soundPath + sound).then(function(intent, playError) {
      if(playError) {
        var playErrorMessage = 'Error playing sound file: ';
        console.log(playErrorMessage, playError);
        bot.sendMessage(authorChannel, playErrorMessage + playError);
      }
      intent.on('error', function(streamError) {
        var streamErrorMessage = 'Error streaming sound file: ';
        console.log(streamErrorMessage, streamError);
        bot.sendMessage(authorChannel, streamErrorMessage + streamError);
      });
      incrementSoundStats(command);
      if(config.autoLeaveVoice) {
        intent.on('end', function() {
          connection.destroy();
        });
      }
    });
  });
}

function sendPopularCommands(message) {
  var total = 0;
  var statsArray = [];
  var popularMessage = '';
  for(var key in stats) {
    if(stats.hasOwnProperty(key)) {
      statsArray.push([key, stats[key]]);
      total += stats[key];
    }
  }
  statsArray.sort(function(a, b) {
    return b[1] - a[1];
  });
  var i = 0;
  while(i < statsArray.length && i < 5) {
    popularMessage += statsArray[i][0] + ' — ' + Math.round((statsArray[i][1] / total) * 100) + '%\n';
    i++;
  }
  bot.sendMessage(message.channel, popularMessage);
}

function playRandomSound(message) {
  var keys = [...commands.keys()];
  var randomKey;
  var randomValue = ['', ''];
  while(randomValue[0] !== 'sound') {
    randomKey = keys[Math.round(keys.length * Math.random())];
    randomValue = commands.get(randomKey);
  }
  playSound(message.channel, message.author.voiceChannel, regExpToCommand(randomKey), randomValue[1]);
}

function isUserBanned(username) {
    var banlist = config.banList.split(',');
    var isBanned = false;
    banlist.forEach(function(bannedUsername){
        if(bannedUsername === username) {
          isBanned = true;
        }
    });
    return isBanned;
}

function displayCommands(message) {
  var helpMessage = '';

  if(message.content.split(' ')[2]) {
    var helpFilter = new RegExp(message.content.split(' ')[2], 'i');
    commands.forEach(function(fileName, command){
      if(command.toString().match(helpFilter)) {
        helpMessage += regExpToCommand(command) + '\n';
      }
    });
  } else {
    commands.forEach(function(fileName, command){
      helpMessage += regExpToCommand(command) + '\n';
    });
  }
  bot.sendMessage(message.channel, helpMessage);
}

bot.on('message', function(message) {

  if(message.author.username !== bot.user.username && !isUserBanned(message.author.username)) {
    commands.forEach(function (botReply, regexp) {
      if(message.content.match(regexp)) {
        switch(botReply[0]) {
          case 'function':
          botReply[1](message);
          break;
          case 'sound':
          playSound(message.channel, message.author.voiceChannel, regExpToCommand(regexp), botReply[1]);
          break;
          case 'text':
          sendMessage(message.channel, botReply[1]);
          break;
          default:
          break;
        }
      }
    });
  }
});


(function init() {
  bot.loginWithToken(config.botToken);

  if(config.autoLoadSounds) {
    addSoundsTo(commands, config.soundPath);
  }

  bot.on('voiceSwitch', function(oldChannel, newChannel, user) {
      var messageChannel = bot.channels.get("name", "hashfag");

      switch(user.username) {
        case 'jonosma':
            playSound(messageChannel, newChannel, regExpToCommand("!bekfast"), "bekfast-short.mp3");
            break;
        case 'ddynz':
            playSound(messageChannel, newChannel, regExpToCommand("!men"), "men.mp3");
            break;
        case 'J1s':
            playSound(messageChannel, newChannel, regExpToCommand("!reese"), "reese.mp3");
            break;
        case 'Commix':
            playSound(messageChannel, newChannel, regExpToCommand("!surprise"), "surprise.mp3");
            break;
        case 'The Penetrator':
            playSound(messageChannel, newChannel, regExpToCommand("!inception"), "inception.mp3");
            break;
        case 'joshr4h':
            playSound(messageChannel, newChannel, regExpToCommand("!wololo"), "wololo.mp3");
            break;
        case 'jamie':
            playSound(messageChannel, newChannel, regExpToCommand("!allah"), "allah.mp3");
            break;
        case 'Vashkar':
            playSound(messageChannel, newChannel, regExpToCommand("!smell"), "smell.mp3");
            break;
        case 'Vashkar':
            playSound(messageChannel, newChannel, regExpToCommand("!smell"), "smell.mp3");
            break;
        case 'Onez':
            playSound(messageChannel, newChannel, regExpToCommand("!cena"), "cena.mp3");
            break;
        default:
            playSound(messageChannel, newChannel, regExpToCommand("!ethan"), "ethan.mp3");
      }
  });

  loadStatsFile();
})();
