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
var firstConnect = true;

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

  function tryMe(fn, msg) {
      if(!msg) {
        msg = '';
      }
      try {
          fn();
      } catch(error) {
          console.log(`an unhandled exception occured. ${msg}`);
          console.log(error);
      }
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
  if(authorVoiceChannel) {
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
    }).catch(function() {
        console.log(`There was an issue attempting to play the file ${sound}`);
    });
  }).catch(function() {
      console.log(`There was an issue joining the channel ${authorVoiceChannel.name} to play the command ${command}`);
  });
  }
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


function messageHandler(message) {
  firstConnect = false;
  if(message.content === "!feet"){
      var item = feet[Math.floor(Math.random()*feet.length)];
      sendMessage(message.channel, item);
  }

  // if(message.content === "!timeroff"){
  //     isTimerActive = false;
  //     sendMessage(message.channel, "Timer is off. RIP in peace.");
  // }

  // if(message.content === "!timer") {
  //     isTimerActive = true;
  //     timerMessage = message;
  //     timer();
  //     sendMessage(message.channel, "Tick tock, check out my cock.");
  // }

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
}

function introSounds(newChannel, user) {
  var messageChannel = bot.channels.get("name", "hashfag");
  
      if(user.status === 'online') {
          if(user.username === 'jonosma') {
              playSound(messageChannel, newChannel, regExpToCommand("!bekfast"), "bekfast.mp3");
          } 
      
          if(user.username === 'ddynz') {
              playSound(messageChannel, newChannel, regExpToCommand("!men"), "men.mp3");       
          } 
          
          if(user.username === 'J1s') {
              playSound(messageChannel, newChannel, regExpToCommand("!reese"), "reese.wav");       
          } 
          
          if(user.username === 'Commix') {
              playSound(messageChannel, newChannel, regExpToCommand("!surprise"), "surprise.mp3");     
          } 
          
          if(user.username === 'The Penetrator') {
              playSound(messageChannel, newChannel, regExpToCommand("!inception"), "inception.mp3");       
          } 
          
          if(user.username === 'joshr4h') {
              playSound(messageChannel, newChannel, regExpToCommand("!dkp"), "dkp.mp3");       
          } 
          
          if(user.username === 'jamie') {
              playSound(messageChannel, newChannel, regExpToCommand("!stonecold"), "stonecold.mp3");
          } 
          
          if(user.username === 'Vashkar') {
              playSound(messageChannel, newChannel, regExpToCommand("!justdoit"), "justdoit.mp3");
          } 
          
          if(user.username === 'Onez') {
              playSound(messageChannel, newChannel, regExpToCommand("!cena"), "cena.mp3");        
          }
      } 
}

var feet = ['http://images.mentalfloss.com/sites/default/files/styles/article_640x430/public/foot_0.jpg', 'http://crossfitaerial.com/wp-content/uploads/2015/07/400-06178255c_998_380.jpg', 'http://kelownafootclinic.com/images/kelowna/foot-problems-flat-feet-kelowna.jpg', 'http://www.nhs.uk/Livewell/foothealth/PublishingImages/feet-in-diabetes_377x171_ACX55Y.jpg', 'http://cdn.images.dailystar.co.uk/dynamic/162/photos/472000/Woman-s-feet-542472.jpg','https://groomingguru.files.wordpress.com/2011/05/frodo4.jpg?w=350&h=200&crop=1', 'http://www.top10homeremedies.com/wp-content/uploads/2013/03/cracked-feet-ft-e1423045913855.jpg', 'http://i.huffpost.com/gen/1829303/thumbs/r-MASSAGE-FEET-large570.jpg', 'http://www.sciencebuzz.org/sites/default/files/images/tootsies2_006.jpg', 'https://s-media-cache-ak0.pinimg.com/originals/fb/b5/83/fbb5837a74193a98fe6734f55aa7fbd0.jpg', 'https://s-media-cache-ak0.pinimg.com/originals/28/74/42/287442c1313ce90bd2a4c1e858ef1add.jpg', 'http://www.bajiroo.com/wp-content/uploads/2013/04/weird_bad_ugly_scary_strange_feet_foot_people_fingers_images_photos_pictures_19.jpg', 'http://themorningspew.com/wp-content/uploads/2011/10/Feet-300x201.jpg', 'https://farm4.staticflickr.com/3388/3409883915_34507999be_z.jpg?zz=1', 'http://s2.storage.snapzu.com/61/29/4a/f2/drunkenninja/snaps/93/9b/133689/thumbs/5304479ffde664e2_fpi_small.jpg'];

bot.on('message', function(message) {
    tryMe(function(){ messageHandler(message) });
});

// bot.on('voiceSpeaking', function(channel, user) {
//     var messageChannel = bot.channels.get("name", "hashfag");
//     //console.log(user);
//     //console.log(channel);
//     if(isUserBanned(user.username)) {
//         console.log('nope');
//         //playSound(messageChannel, channel, regExpToCommand("!horn"), "horn.mp3");  
//     } else {
//         console.log('allowed');
//     }
// });

bot.on('voiceJoin', function(channel, user) {
    if(!firstConnect){
        tryMe(function() { introSounds(channel, user) });
    }
});

bot.on('voiceSwitch', function(oldChannel, newChannel, user) {
    tryMe(function() { introSounds(newChannel, user) });
});

function bindSoundsFolder() {
    console.log('Loading sounds...');
    fs.readdir('./sounds', {}, function(err, files) {
        files.forEach(function(element, index, array){
            var cmd = element.split('.')[0];
            if(cmd) {
                var reg = new RegExp(`!${cmd}`, 'i');
            
                commands.set(reg, ['sound', element]);
            }
            
        });
        console.log(`Completed loading ${files.length} files!`);
    });
}

(function init() {

  //bot.on("debug", (m) => console.log("[debug]", m));
  //bot.on("warn", (m) => console.log("[warn]", m));
  bot.on('error', e => { console.error(e); });
  bindSoundsFolder();
  bot.loginWithToken(config.botToken);



  if(config.autoLoadSounds) {
    addSoundsTo(commands, config.soundPath);
  }
  loadStatsFile();
})();
