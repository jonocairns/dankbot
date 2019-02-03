# dankbot
A dank soundboard for discord. Check out the sounds folder for all the current lols.

[![Circle CI](https://circleci.com/gh/jonocairns/dankbot.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/jonocairns/dankbot) [![Code Climate](https://codeclimate.com/github/jonocairns/dankbot/badges/gpa.svg)](https://codeclimate.com/github/jonocairns/dankbot)

Uses node, es6, ava (tests), sinon (stub/mock), eslint, circle-ci (build) and heroku (deployment/environment)

## Mini Docs

Play a random meme with `!meme` 

Typing `!bot help` with DM you all the available commands.

Typing `!bot exit` will force the bot to leave the current users voice channel.

Typing `!yt https://www.youtube.com/watch?v=PGNiXGX2nLU 0 1` will stream the youtube audio to the current users voice channel. (0 and 1 are both optional)0 is the time you want to start from and 1 is the volume.

Typing `!clear 3` or `!clear` will clear the last N chat messages, defaulted to 10.

Typing `!auth` will send you the invite code required to get some dank up in your server

`commands.set(<regexp>, array[type, reply])` - `regexp` is what your bot will match messages against, regular expressions are used here mainly to make things case-insensitive. `type` can currently be `function`, `sound`, or `text`, but can be extended further if your bot requires additional functionality.

Ban people from using the command by going in to the config.json file and adding them in to a comma separated list. eg. "user1,user2" 

## Roadmap
- If banned people start talking in voice chat they can be airhorned.

- Ability to easily add new sounds (somehow). Maybe looking for mp3ish files in chat then downloading them to the sounds folder?

## Getting Started
1. Clone this repository
2. After completing the prerequisites (below, mainly ffmpeg), run `npm install` on this project making sure nothing fails, particularly `node-opus` (https://www.microsoft.com/en-nz/download/confirmation.aspx?id=48159)
3. Authorize your bot using this URL `https://discordapp.com/oauth2/authorize?client_id=APPLICATION_ID&scope=bot&permissions=0` where APPLICATION_ID is your `Application ID` and add it to a server you manage.
4. Run `npm run start` from the project

## Development
You can run 'npm run prep' locally and it will lint/test the app.

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
