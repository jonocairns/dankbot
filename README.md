# dankbot
A dank soundboard for discord. Check out the sounds folder for all the current lols.

[![Circle CI](https://circleci.com/gh/jonocairns/dankbot.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/jonocairns/dankbot) [![Code Climate](https://codeclimate.com/github/jonocairns/dankbot/badges/gpa.svg)](https://codeclimate.com/github/jonocairns/dankbot)

Uses node, typescript, eslint, circle-ci (build) and heroku (deployment/environment)

## Mini Docs

Play a random meme with `.meme` 

Typing `.help` will DM you some basic starting commands.

Typing `.eg` will DM you a sample of 10 available commands.

Typing `.leave` will force the bot to leave the current users voice channel.

Typing `.yt https://www.youtube.com/watch?v=PGNiXGX2nLU` will stream the youtube audio to the current users voice channel.

## Getting Started
1. Clone this repository
2. After completing the prerequisites, run `yarn install` on this project.
3. Authorize your bot using this URL `https://discordapp.com/oauth2/authorize?client_id=APPLICATION_ID&scope=bot&permissions=0` where APPLICATION_ID is your `Application ID` and add it to a server you manage.
4. Run `yarn start` from the project

### Prerequisites
- Create a new [Discord application](https://discordapp.com/developers/applications/me)
  - Navigate to [your Discord applications](https://discordapp.com/developers/applications/me)
  - Create a bot user and copy its `Token`, then run cp `.env.example .env` then open the `.env` file and set `DISCORD_BOT_TOKEN=YOURTOKEN`

