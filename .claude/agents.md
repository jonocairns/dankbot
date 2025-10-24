# Dankbot Agents

Quick reference for specialized development tasks.

---

## voice-personality-creator
**Use when:** Adding new character personalities for the `/ask` command

**Task:** Create a new AI voice personality

**Steps:**
1. Review existing prompts in `src/prompts/` (see `donald.ts` as example)
2. Create new prompt file with system message and character personality
3. Add configuration to `src/voices.ts` with name and system prompt
4. Test responses are in-character and concise (under 500 chars for TTS)

**Key files:** `src/voices.ts`, `src/prompts/*.ts`, `src/commands/ask.ts`

---

## command-builder
**Use when:** Adding new Discord slash commands

**Task:** Create a new command

**Steps:**
1. Create command file in `src/commands/` using `SlashCommandBuilder`
2. Export `data` and `execute` function
3. Add export to `src/commands/index.ts`
4. Use `getPlayer()` for voice features, `logger` for logging
5. Implement error handling and resource cleanup

**Key files:** `src/commands/*.ts`, `src/getPlayer.ts`, `src/logger.ts`

---

## sound-manager
**Use when:** Managing meme sounds

**Task:** Add or organize sound files

**Steps:**
1. Add audio files (MP3, WAV, M4A) to `sounds/` directory
2. Use descriptive filenames (they become meme identifiers)
3. Test playback with `/meme` command

**Key files:** `sounds/`, `src/commands/meme.ts`

---

## docker-optimizer
**Use when:** Optimizing Docker builds or deployment

**Task:** Improve Docker configuration

**Steps:**
1. Review multi-stage `Dockerfile` for optimizations
2. Check layer caching and dependencies (FFmpeg, opus, etc.)
3. Test with `yarn docker:build` and `yarn docker:run`
4. Review/create `.dockerignore`

**Key files:** `Dockerfile`, `.dockerignore`, `.github/workflows/docker.yml`

---

## ai-prompt-tuner
**Use when:** Adjusting AI behavior and personalities

**Task:** Fine-tune AI responses

**Steps:**
1. Review prompts in `src/prompts/`
2. Test with `/ask` command or bot mentions
3. Adjust system prompts for character accuracy and conciseness
4. Update model parameters in `src/voices.ts` (temperature, max_tokens)
5. Consider token limits for TTS API

**Key files:** `src/prompts/*.ts`, `src/voices.ts`, `src/ai.ts`

---

## error-debugger
**Use when:** Debugging voice, audio, or API errors

**Task:** Diagnose and fix runtime issues

**Steps:**
1. Check Winston logs for errors
2. For voice issues: verify FFmpeg, check `src/getPlayer.ts` and `src/cleanUp.ts`
3. For API errors: verify `.env` variables (`DISCORD_BOT_TOKEN`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `TTS_PROVIDER`, `PIPER_HOST`, `PIPER_PORT`)
4. For audio issues: test FFmpeg, opus codec
5. Add defensive error handling where needed

**Key files:** `src/logger.ts`, `src/getPlayer.ts`, `src/cleanUp.ts`, `src/getVariables.ts`

---

## typescript-maintainer
**Use when:** Fixing TypeScript errors or updating dependencies

**Task:** Maintain code quality and type safety

**Steps:**
1. Run `yarn build` to identify TypeScript errors
2. Fix type errors with proper annotations and imports
3. Run `yarn lint` and `yarn lint:fix`
4. Update `@types/*` packages if needed

**Key files:** `tsconfig.json`, `package.json`, ESLint config

---

## ci-pipeline-engineer
**Use when:** Working on CI/CD pipelines

**Task:** Improve or fix GitHub Actions workflows

**Steps:**
1. Review workflows in `.github/workflows/` (`ci.yml`, `docker.yml`)
2. Verify Node version matches package.json (22.0.0+)
3. Check Docker build/push steps and secrets configuration
4. Optimize caching and parallel jobs

**Key files:** `.github/workflows/*.yml`, `package.json`, `Dockerfile`
