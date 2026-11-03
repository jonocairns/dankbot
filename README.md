# dankbot
![build-status](https://github.com/jonocairns/dankbot/actions/workflows/ci.yml/badge.svg?branch=master)
![build-status](https://github.com/jonocairns/dankbot/actions/workflows/docker.yml/badge.svg?branch=master)

A dank soundboard for discord. Check out the sounds folder for all the current lols.

Uses node, typescript, eslint, github actions (build) and docker

## Commands

- `/meme` - Play a random meme sound, or `/meme {specific meme}` to play a specific one
- `/ask {question}` - Ask the bot a question using AI, with text-to-speech response in voice channel
- `/img prompt: {description}` - Generate an image using AI (supports optional image attachment for context)

## Getting Started
1. Clone this repository
2. Ensure you're running Node 22.12.0+ then run `yarn install` on this project
3. Create and authorize your bot (see prerequisites), then update .env with the APPLICATION_ID and DISCORD_BOT_TOKEN
4. Run `yarn start` from the project

### Prerequisites
  - Create a new [Discord application](https://discordapp.com/developers/applications/me)
  - Navigate to [your Discord applications](https://discordapp.com/developers/applications/me)
  - Create a bot user and copy its `Token`, then run cp `.env.example .env` then open the `.env` file and set all required variables

## Production security

All AI commands and bot mentions share a limit of 5 requests per user and 20
requests across the bot per rolling minute. Each user can have one active AI
request, with at most 3 active requests across the bot. These limits reset when
the bot restarts; set spending limits with your AI providers as well.

Set `AI_ALLOWED_GUILD_IDS` and/or `AI_ALLOWED_USER_IDS` to comma-separated Discord
IDs to restrict paid AI features. Empty values allow members of any server where
the bot is installed. AI requests in direct messages are disabled.

Prompts are limited to 4,000 characters, thread context to 16,000 characters, and
chat completions to 500 tokens. Attachment downloads accept PNG, JPEG, WebP and
GIF files up to 10 MiB from Discord's attachment CDN, with redirects disabled and
a 15-second download deadline. Replies do not notify mentioned users or roles.

Run `yarn test`, `yarn lint`, and `yarn audit:production` before deploying.
The `tar` resolution keeps native dependency installers on a patched release;
check native Opus loading when updating it. Docker publishing accepts only a
successful push build on this repository's `master` branch and builds the exact
commit that passed CI.
Superseded CI runs skip publishing so an older commit cannot replace a newer
production image.

