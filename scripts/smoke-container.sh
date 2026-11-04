#!/usr/bin/env bash
set -euo pipefail

image="${1:?Pass the image to test}"
expected_version="${2:-}"

docker run --rm --network none --read-only --tmpfs /tmp \
  --env EXPECTED_VERSION="$expected_version" --entrypoint node "$image" -e '
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  const { spawnSync } = require("node:child_process");
  const path = require("node:path");

  assert.equal(process.getuid(), 1000);
  assert.equal(process.env.NODE_ENV, "production");
  const pkg = require(path.join(process.cwd(), "package.json"));
  if (process.env.EXPECTED_VERSION) assert.equal(pkg.version, process.env.EXPECTED_VERSION);
  assert(fs.existsSync("dist/index.js"));
  assert(fs.existsSync(process.env.NODE_EXTRA_CA_CERTS));
  assert(!fs.existsSync(".env"));
  assert(!fs.existsSync("node_modules/typescript"));
  assert(!fs.existsSync("node_modules/@biomejs/biome"));
  const opus = new (require("@discordjs/opus").OpusEncoder)(48000, 2);
  assert(opus.encode(Buffer.alloc(3840)).length > 0);
  require("@snazzah/davey");
  require("libsodium-wrappers");
  require("discord.js");
  require("@discordjs/voice");
  assert.equal(require("ffmpeg-static"), process.env.FFMPEG_BIN);
  const sound = fs.readdirSync("sounds").find((file) => file.endsWith(".mp3"));
  assert(sound, "A bundled meme sound is required");
  const decoded = spawnSync(process.env.FFMPEG_BIN, [
    "-v", "error", "-i", path.join("sounds", sound), "-t", "0.05",
    "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1",
  ]);
  assert.equal(decoded.status, 0, decoded.stderr?.toString());
  assert(decoded.stdout.length > 0);
  console.log(`Container ${pkg.version}: native voice dependencies and FFmpeg work as UID ${process.getuid()}`);
'

# Exercise the real entry point without credentials or a Discord connection.
if startup="$(docker run --rm --network none --read-only --tmpfs /tmp "$image" 2>&1)"; then
  echo "Expected startup to reject missing credentials" >&2
  exit 1
fi
if [[ "$startup" != *"DISCORD_BOT_TOKEN not defined"* ]]; then
  printf '%s\n' "$startup" >&2
  exit 1
fi
