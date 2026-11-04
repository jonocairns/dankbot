# dankbot
![build-status](https://github.com/jonocairns/dankbot/actions/workflows/ci.yml/badge.svg)
![release-status](https://github.com/jonocairns/dankbot/actions/workflows/release.yml/badge.svg?branch=master)

A dank soundboard for discord. Check out the sounds folder for all the current lols.

Uses Node, TypeScript, Biome, Nix, GitHub Actions, and Docker.

## Commands

- `/meme` - Play a random meme sound, or `/meme {specific meme}` to play a specific one
- `/ask {question}` - Ask the bot a question using AI, with text-to-speech response in voice channel
- `/img prompt: {description}` - Generate an image using AI (supports optional image attachment for context)

Voice commands replace the current playback in the same server. The bot leaves
the voice channel after 60 seconds without playback. `/ask` sends its text answer
before generating speech, so an audio failure does not lose the answer. Chat,
speech generation and playback startup share a two-minute deadline.

## Getting Started
1. Clone this repository
2. Ensure you're running Node 22.12.0+ then run `yarn install` on this project
3. Create and authorize your bot (see prerequisites), then update .env with the APPLICATION_ID and DISCORD_BOT_TOKEN
4. Run `yarn start` from the project

### Development with Nix

With Nix and flakes enabled, run `nix develop`, then `yarn install --immutable`.
The shell supplies Node 22, the committed Yarn 4 version, FFmpeg, Python, and a
C/C++ toolchain for native Opus builds. Corepack is not required. Existing
direnv users can run `direnv allow` to load the same shell automatically.
Claude Code is available only in the optional `nix develop .#claude` shell.

Run `nix flake check --print-build-logs` to build, lint, and test the bot offline
after Nix fetches the pinned dependencies. Run `nix fmt flake.nix nix/package.nix`
to format Nix files.
After changing `yarn.lock`, update the extra platform checksums and dependency
cache hash using the instructions in [nix/README.md](nix/README.md).

`TTS_PROVIDER` accepts `openai` or `piper`; `IMAGE_PROVIDER` accepts `openai` or
`gemini`. Invalid provider names stop startup instead of selecting a fallback.
When using Piper, set `PIPER_HOST` to a server reachable from the bot and
`PIPER_PORT` to an integer from 1 to 65535. API keys are checked when their
provider is used, so soundboard-only setups do not require them.

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
verified release commit on this repository's `master` history, after quality
checks and a container smoke test pass.

## Docker and releases

Run `yarn docker:build` to build and load `jonocairns/dankbot:latest`, then
`yarn docker:run` to start it with your `.env` file. The equivalent build commands
are `nix build .#dockerImage` and `docker load --input result` (Linux only).
Nix supplies the runtime dependencies directly; no Dockerfile or Alpine package
installation is needed. The image runs as UID 1000 and includes FFmpeg, native
voice dependencies, CA certificates, and the bundled sounds.

Releases use the same Release Please pattern as Ripcord: merge conventional
commits, review and merge the generated release PR, then let automation build
and publish the release. Docker Hub receives `vX.Y.Z` and `latest` tags; ordinary
pushes no longer publish `latest`. See [docs/releases.md](docs/releases.md) for
the GitHub App setup and release recovery.

