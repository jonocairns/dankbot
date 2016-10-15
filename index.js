'use strict';

var fs = require('fs');
var config = require('./config.json');
var Discord = require('discord.js');
var bot = new Discord.Client({ autoReconnect: true });
var timerMessage;
var isTimerActive = false;
var stats;
var commands = new Map();
var triggerPrefix = config.commandTrigger + config.botPrefix + ' ';
commands.set(new RegExp(triggerPrefix + 'help', 'i'), ['function', displayCommands]);
commands.set(new RegExp(triggerPrefix + 'random', 'i'), ['function', playRandomSound]);
commands.set(new RegExp(triggerPrefix + 'popular', 'i'), ['function', sendPopularCommands]);
commands.set(new RegExp(triggerPrefix + 'exit', 'i'), ['function', leaveVoiceChannel]);
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
commands.set(/!noice/i, ['sound', 'noice.mp3']);
commands.set(/!lotion/i, ['sound', 'lotion.mp3']);
commands.set(/!trump/i, ['sound', 'trump.mp3']);
commands.set(/!hello/i, ['sound', 'hello.mp3']);
commands.set(/!bye/i, ['sound', 'bye.mp3']);
commands.set(/!dry/i, ['sound', 'dry.mp3']);
commands.set(/!hand/i, ['sound', 'hand.mp3']);
commands.set(/!son/i, ['sound', 'son.mp3']);
commands.set(/!stars/i, ['sound', 'stars.mp3']);
commands.set(/!universe/i, ['sound', 'universe.mp3']);
commands.set(/!size/i, ['sound', 'size.mp3']);
commands.set(/!eli/i, ['sound', 'eli.mp3']);
commands.set(/!hugh/i, ['sound', 'hugh.mp3']);
commands.set(/!mungus/i, ['sound', 'mungus.mp3']);

commands.set(/!vape/i, ['sound', 'vape.mp3']);
commands.set(/!china/i, ['sound', 'china.mp3']);
commands.set(/!penis/i, ['sound', 'penis.mp3']);
commands.set(/!pedo/i, ['sound', 'pedo.mp3']);
commands.set(/!fuck/i, ['sound', 'fuck.mp3']);
commands.set(/!fgt/i, ['sound', 'fgt.mp3']);
commands.set(/!indian/i, ['sound', 'indian.mp3']);
commands.set(/!faces/i, ['sound', 'faces.mp3']);
commands.set(/!win/i, ['sound', 'win.mp3']);
commands.set(/!crawling/i, ['sound', 'crawling.mp3']);
commands.set(/!wake/i, ['sound', 'wake.mp3']);

commands.set(/!fedora/i, ['sound', 'fedora.mp3']);
commands.set(/!troll/i, ['sound', 'troll.mp3']);
commands.set(/!think/i, ['sound', 'think.mp3']);
commands.set(/!mechanical/i, ['sound', 'mechanical.mp3']);
commands.set(/!throat/i, ['sound', 'throat.mp3']);

commands.set(/!huh/i, ['sound', 'huh.mp3']);
commands.set(/!dove/i, ['sound', 'dove.mp3']);
commands.set(/!success/i, ['sound', 'success.mp3']);
commands.set(/!another/i, ['sound', 'another.mp3']);
commands.set(/!autistic/i, ['sound', 'autistic.mp3']);
commands.set(/!jitter/i, ['sound', 'jitter.mp3']);

commands.set(/!cash/i, ['sound', 'cash.mp3']);
commands.set(/!mic/i, ['sound', 'mic.mp3']);
commands.set(/!problems/i, ['sound', 'problems.mp3']);
commands.set(/!bill/i, ['sound', 'bill.mp3']);
commands.set(/!slap/i, ['sound', 'slap.mp3']);
commands.set(/!fans/i, ['sound', 'fans.mp3']);

commands.set(/!dkp/i, ['sound', 'dkp.mp3']);
commands.set(/!who/i, ['sound', 'who.mp3']);
commands.set(/!whelps/i, ['sound', 'whelps.mp3']);
commands.set(/!high/i, ['sound', 'high.mp3']);
commands.set(/!fix/i, ['sound', 'fix.mp3']);

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

function getRandomArbitrary() {
    return (Math.random() * (config.randomMax - config.randomMin) + config.randomMin) * 60000;
}

function timer() {
    var nextIn = getRandomArbitrary();
    nextIn = Math.floor(nextIn);
    console.log(nextIn);
    if(timerMessage && isTimerActive) {
        playRandomSound(timerMessage);
        setTimeout(timer, nextIn);
    }
}

var feet = ['http://images.mentalfloss.com/sites/default/files/styles/article_640x430/public/foot_0.jpg', 'http://crossfitaerial.com/wp-content/uploads/2015/07/400-06178255c_998_380.jpg', 'http://kelownafootclinic.com/images/kelowna/foot-problems-flat-feet-kelowna.jpg', 'http://www.nhs.uk/Livewell/foothealth/PublishingImages/feet-in-diabetes_377x171_ACX55Y.jpg', 'http://cdn.images.dailystar.co.uk/dynamic/162/photos/472000/Woman-s-feet-542472.jpg','https://groomingguru.files.wordpress.com/2011/05/frodo4.jpg?w=350&h=200&crop=1', 'http://www.top10homeremedies.com/wp-content/uploads/2013/03/cracked-feet-ft-e1423045913855.jpg', 'http://i.huffpost.com/gen/1829303/thumbs/r-MASSAGE-FEET-large570.jpg', 'http://www.sciencebuzz.org/sites/default/files/images/tootsies2_006.jpg', 'https://s-media-cache-ak0.pinimg.com/originals/fb/b5/83/fbb5837a74193a98fe6734f55aa7fbd0.jpg', 'https://s-media-cache-ak0.pinimg.com/originals/28/74/42/287442c1313ce90bd2a4c1e858ef1add.jpg', 'http://www.bajiroo.com/wp-content/uploads/2013/04/weird_bad_ugly_scary_strange_feet_foot_people_fingers_images_photos_pictures_19.jpg', 'http://themorningspew.com/wp-content/uploads/2011/10/Feet-300x201.jpg', 'https://farm4.staticflickr.com/3388/3409883915_34507999be_z.jpg?zz=1', 'http://s2.storage.snapzu.com/61/29/4a/f2/drunkenninja/snaps/93/9b/133689/thumbs/5304479ffde664e2_fpi_small.jpg'];

bot.on('message', function(message) {

  if(message.content === "!feet"){
      var item = feet[Math.floor(Math.random()*feet.length)];
      sendMessage(message.channel, item);
  }

  if(message.content === "!timeroff"){
      isTimerActive = false;
      sendMessage(message.channel, "Timer is off. RIP in peace.");
  }

  if(message.content === "!timer") {
      isTimerActive = true;
      timerMessage = message;
      timer();
      sendMessage(message.channel, "Tick tock, check out my cock.");
  }

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

bot.on('voiceSwitch', function(oldChannel, newChannel, user) {
      var messageChannel = bot.channels.get("name", "hashfag");

      if(user.username === 'jonosma') {
          playSound(messageChannel, newChannel, regExpToCommand("!bekfast"), "bekfast-short.mp3");
      } 
      
      if(user.username === 'ddynz') {
          playSound(messageChannel, newChannel, regExpToCommand("!men"), "men.mp3");       
      } 
      
      if(user.username === 'J1s') {
          playSound(messageChannel, newChannel, regExpToCommand("!reese"), "reese.mp3");       
      } 
      
      if(user.username === 'Commix') {
          playSound(messageChannel, newChannel, regExpToCommand("!surprise"), "surprise.mp3");     
      } 
      
      if(user.username === 'The Penetrator') {
          playSound(messageChannel, newChannel, regExpToCommand("!inception"), "inception.mp3");       
      } 
      
      if(user.username === 'joshr4h') {
          playSound(messageChannel, newChannel, regExpToCommand("!wololo"), "wololo.mp3");       
      } 
      
      if(user.username === 'jamie') {
          playSound(messageChannel, newChannel, regExpToCommand("!allah"), "allah.mp3");
      } 
      
      if(user.username === 'Vashkar') {
          playSound(messageChannel, newChannel, regExpToCommand("!justdoit"), "justdoit.mp3");
      } 
      
      if(user.username === 'Onez') {
          playSound(messageChannel, newChannel, regExpToCommand("!cena"), "cena.mp3");        
      }
  });

(function init() {
  bot.loginWithToken(config.botToken);

  if(config.autoLoadSounds) {
    addSoundsTo(commands, config.soundPath);
  }
  loadStatsFile();
})();
