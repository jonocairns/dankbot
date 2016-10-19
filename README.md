# dankbot
A dank soundboard for discord. Check out the sounds folder for all the current lols.

[![Circle CI](https://circleci.com/gh/jonocairns/dankbot.svg?style=svg)](https://circleci.com/gh/jonocairns/dankbot)

## Mini Docs
Add memes to the sounds folder. Whatever you name the file will be ready when you launch the app. Eg dank.mp3 can be run with !dank.

If you know some basic coding, you can go in to the index.js file and alter the introSounds function. This can be used to play sounds when a particular user joins a voice channel. 

`autoLeaveVoice` - When set to `true`, the bot will leave after playing a sound. The sound of a bot joining/leaving a voice channel can be annoying, so by setting this to false, the bot will stay in the voice channel until told to leave by the `!bot exit` command.

`autoLoadSounds` - When set to `true`, the bot will attempt to load in every file placed in the `sounds` directory. To generate the sound's command, `soundCommandTrigger` is prepended, the audio extension is stripped off, and hyphens are converted to spaces.

`commands.set(<regexp>, array[type, reply])` - `regexp` is what your bot will match messages against, regular expressions are used here mainly to make things case-insensitive. `type` can currently be `function`, `sound`, or `text`, but can be extended further if your bot requires additional functionality.

Ban people from using the command by going in to the config.json file and adding them in to a comma separated list. eg. "user1,user2" 

## Roadmap
- If banned people start talking in voice chat they can be airhorned.

- Ability to easily add new sounds (somehow). Maybe looking for mp3ish files in chat then downloading them to the sounds folder?

- Image search

- Wiki search

- Reminders

## Getting Started
1. Clone this repository
2. After completing the prerequisites, run `npm install` on this project making sure nothing fails, particularly `node-opus`
3. Open `config.json` and add your bot's `Token` where it says `APP_BOT_USER_TOKEN`
4. Authorize your bot using this URL `https://discordapp.com/oauth2/authorize?client_id=APPLICATION_ID&scope=bot&permissions=0` where APPLICATION_ID is your `Application ID` and add it to a server you manage.
5. Run `npm run start` from the project

### Prerequisites
1. Everything from the [discord.js documentation](http://discordjs.readthedocs.io/en/latest/installing.html), which generally includes
  - Your operating system's developer tools
  - Node.js
  - ffmpeg installed and on your PATH
2. Create a new [Discord application](https://discordapp.com/developers/applications/me)
  - Navigate to [your Discord applications](https://discordapp.com/developers/applications/me)
  - Create a new application and keep its `Application ID` handy
  - Create a bot user and keep its `Token` handy

## Acknowledgments
- **Michael Deeb** - *provided the base project* - [michaeljdeeb](https://github.com/michaeljdeeb)
- [Discord](https://discordapp.com/)
- [discord.js](https://github.com/hydrabolt/discord.js)
