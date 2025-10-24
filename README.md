# dankbot
![build-status](https://github.com/jonocairns/dankbot/actions/workflows/ci.yml/badge.svg?branch=master)
![build-status](https://github.com/jonocairns/dankbot/actions/workflows/docker.yml/badge.svg?branch=master)

A dank soundboard for discord. Check out the sounds folder for all the current lols.

Uses node, typescript, eslint, github actions (build) and docker

## Commands

- `/meme` - Play a random meme sound, or `/meme {specific meme}` to play a specific one
- `/yt https://youtube.com/watch?v=...` - Stream YouTube audio to your current voice channel
- `/ask {question}` - Ask the bot a question using AI, with text-to-speech response in voice channel
- `/img prompt: {description}` - Generate an image using AI (supports optional image attachment for context)

## Getting Started
1. Clone this repository
2. Ensure you're running Node 22.0.0+ then run `yarn install` on this project
3. Create and authorize your bot (see prerequisites), then update .env with the APPLICATION_ID and DISCORD_BOT_TOKEN
4. Run `yarn start` from the project

### Prerequisites
  - Create a new [Discord application](https://discordapp.com/developers/applications/me)
  - Navigate to [your Discord applications](https://discordapp.com/developers/applications/me)
  - Create a bot user and copy its `Token`, then run cp `.env.example .env` then open the `.env` file and set all required variables

