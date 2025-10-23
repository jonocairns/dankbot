# Dankbot Agents

## voice-personality-creator
**Use this agent when:** Adding new character voices or personalities to the bot

**Task:** Create a new character voice personality for the /ask command

**Instructions:**
1. Review existing voice configurations in `src/voices.ts` to understand the structure
2. Check the available ElevenLabs voice IDs and character personalities
3. Create a new prompt file in `src/prompts/` following the existing pattern (see `src/prompts/donald.ts` as reference)
4. Add the new voice configuration to `src/voices.ts` with appropriate:
   - Display name
   - ElevenLabs voice ID
   - System prompt import
   - Model settings (temperature, max tokens)
5. Update the command choices in `src/commands/ask.ts` to include the new personality
6. Test the voice responds appropriately to questions in character
7. Ensure the prompt instructs the AI to give concise responses (under 500 characters) suitable for TTS

**Context files:**
- `src/voices.ts` - Voice configurations
- `src/prompts/*.ts` - Character prompt templates
- `src/commands/ask.ts` - Command implementation

---

## command-builder
**Use this agent when:** Adding new slash commands to the bot

**Task:** Create a new Discord slash command

**Instructions:**
1. Review existing commands in `src/commands/` to understand the command structure
2. Create a new command file in `src/commands/` following the pattern:
   - Export a `data` object using `SlashCommandBuilder`
   - Export an `execute` async function that handles the interaction
3. Implement proper error handling and user feedback
4. Add the command export to `src/commands/index.ts`
5. If the command uses voice channels, use `getPlayer()` utility from `src/getPlayer.ts`
6. Follow logging patterns using the Winston logger from `src/logger.ts`
7. Test the command registration and execution
8. Ensure proper cleanup of resources (voice connections, audio players)

**Context files:**
- `src/commands/*.ts` - Existing command implementations
- `src/getPlayer.ts` - Audio player utility
- `src/logger.ts` - Logging utility
- `src/index.ts` - Main bot file for command registration

---

## sound-manager
**Use this agent when:** Managing the sound library or adding new meme sounds

**Task:** Add, organize, or manage sound files in the sounds directory

**Instructions:**
1. Check the `sounds/` directory structure and existing audio files
2. For new sounds:
   - Ensure audio format is supported (MP3, WAV, M4A)
   - Use descriptive filenames (they become the meme identifiers)
   - Keep file sizes reasonable for quick playback
3. Verify FFmpeg can process the audio files
4. Test playback using the `/meme` command
5. Consider organizing sounds into subdirectories if the library grows too large
6. Update any documentation about available sounds

**Context files:**
- `sounds/` - Audio file directory
- `src/commands/meme.ts` - Meme playback command

---

## docker-optimizer
**Use this agent when:** Optimizing Docker builds or deployment configuration

**Task:** Improve Docker configuration, build performance, or deployment process

**Instructions:**
1. Review the multi-stage `Dockerfile` for optimization opportunities
2. Check layer caching effectiveness and dependency installation
3. Verify all required runtime dependencies are included (FFmpeg, opus, etc.)
4. Ensure environment variables are properly configured
5. Test the Docker build process: `yarn docker:build`
6. Verify the container runs correctly: `yarn docker:run`
7. Check image size and consider optimizations
8. Review `.dockerignore` if it exists, or create one to exclude unnecessary files

**Context files:**
- `Dockerfile` - Container configuration
- `package.json` - Build scripts
- `.github/workflows/docker.yml` - Docker CI/CD pipeline

---

## ai-prompt-tuner
**Use this agent when:** Adjusting AI behavior, personality prompts, or response quality

**Task:** Fine-tune AI responses and character personalities

**Instructions:**
1. Review existing prompts in `src/prompts/` directory
2. Test current AI responses using the `/ask` command or mention functionality
3. Adjust system prompts to:
   - Improve character accuracy and authenticity
   - Keep responses concise (important for TTS)
   - Balance humor/offensiveness based on requirements
   - Ensure responses are contextually appropriate
4. Update OpenAI model parameters in `src/voices.ts` (temperature, max_tokens)
5. Test changes with various question types
6. Consider token limits for ElevenLabs TTS API
7. Review the default personality in `src/ai.ts` for mention responses

**Context files:**
- `src/prompts/*.ts` - Character prompts
- `src/voices.ts` - Voice and model configurations
- `src/ai.ts` - AI chat functionality
- `src/commands/ask.ts` - Ask command implementation

---

## error-debugger
**Use this agent when:** Debugging issues with voice connections, audio playback, or API errors

**Task:** Diagnose and fix runtime errors and connectivity issues

**Instructions:**
1. Check Winston logs for error messages and stack traces
2. For voice connection issues:
   - Verify FFmpeg is available and working
   - Check Discord.js voice connection state
   - Review `src/getPlayer.ts` for connection handling
   - Ensure proper cleanup in `src/cleanUp.ts`
3. For API errors:
   - Verify environment variables in `.env` (BOT_TOKEN, OPENAI_API_KEY, ELEVENLABS_API_KEY)
   - Check API rate limits and quotas
   - Review error responses from external APIs
4. For audio playback issues:
   - Test audio file formats and FFmpeg compatibility
   - Check opus codec availability
   - Verify ytdl-core functionality for YouTube streaming
5. Add defensive error handling where missing
6. Improve error messages for better user feedback

**Context files:**
- `src/logger.ts` - Logging configuration
- `src/getPlayer.ts` - Voice connection and player setup
- `src/cleanUp.ts` - Resource cleanup
- `src/getVariables.ts` - Environment variable loading

---

## typescript-maintainer
**Use this agent when:** Fixing TypeScript errors, improving type safety, or updating dependencies

**Task:** Maintain TypeScript code quality and type correctness

**Instructions:**
1. Run the build command to identify TypeScript errors: `yarn build`
2. Review `tsconfig.json` for strict mode settings
3. Fix type errors by:
   - Adding proper type annotations
   - Importing types from Discord.js and other libraries
   - Using proper generics and type guards
4. Run linter to check code quality: `yarn lint`
5. Fix linting issues: `yarn lint:fix`
6. Update `@types/*` packages if needed
7. Ensure strict null checks are handled properly
8. Review dependency versions in `package.json`

**Context files:**
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies
- `.eslintrc.*` - ESLint configuration (if exists)

---

## ci-pipeline-engineer
**Use this agent when:** Working on GitHub Actions workflows or CI/CD improvements

**Task:** Improve or fix CI/CD pipelines

**Instructions:**
1. Review workflow files in `.github/workflows/`:
   - `ci.yml` - Build and test pipeline
   - `docker.yml` - Docker build pipeline
2. Ensure workflows run on appropriate triggers (push, PR, etc.)
3. Verify Node.js version matches `package.json` engines specification
4. Check Docker build and push steps
5. Add or improve testing steps if needed
6. Optimize workflow performance (caching, parallel jobs)
7. Ensure secrets are properly configured (BOT_TOKEN, API keys)
8. Test workflow changes on a feature branch

**Context files:**
- `.github/workflows/*.yml` - CI/CD workflows
- `package.json` - Scripts and engine requirements
- `Dockerfile` - Container build configuration
