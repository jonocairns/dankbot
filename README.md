# dankbot
A dank soundboard for discord. Check out the sounds folder for all the current lols.

Uses node, typescript, eslint, github actions (build) and docker

## Docs

Play a random meme with `/meme` or `/meme {specific meme here}`

Typing `/yt https://www.youtube.com/watch?v=PGNiXGX2nLU` will stream the youtube audio to the current users voice channel.

## Getting Started
1. Clone this repository
2. Ensure you're running node 16.X then run `yarn install` on this project.
3. Create an authorize your bot (see prerequisites), then update .env with the APPLICATION_ID and DISCORD_BOT_TOKEN
4. Run `yarn start` from the project

### Prerequisites
  - Create a new [Discord application](https://discordapp.com/developers/applications/me)
  - Navigate to [your Discord applications](https://discordapp.com/developers/applications/me)
  - Create a bot user and copy its `Token`, then run cp `.env.example .env` then open the `.env` file and set all required variables

