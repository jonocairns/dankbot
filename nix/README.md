# Nix builds

`flake.lock` pins the toolchain and runtime packages. The development shell and
container share Node 22 and FFmpeg. The committed Yarn bundle pins Yarn 4.10.3.
The default shell does not include Claude Code or enable unfree packages.

`nix build` builds the bot, runs lint and tests, prunes development dependencies,
and checks native Opus and DAVE loading. `nix build .#dockerImage` uses that same
package in a Docker image, without requiring a Docker daemon to build it.
Docker is required to load, smoke test, and run the image.

The source file list in `package.nix` excludes `.env`, local dependencies, and
editor settings. Secrets are supplied only when starting the container.

## Updating dependencies

After a dependency update changes `yarn.lock`, regenerate checksums for optional
platform packages that Yarn omits from its lockfile:

```sh
nix shell --inputs-from . nixpkgs#yarn-berry_4.yarn-berry-fetcher \
  --command yarn-berry-fetcher missing-hashes yarn.lock > nix/missing-hashes.json
nix shell --inputs-from . nixpkgs#yarn-berry_4.yarn-berry-fetcher \
  --command yarn-berry-fetcher prefetch yarn.lock nix/missing-hashes.json
```

Put the printed `sha256-...` hash in `offlineCache.hash` in `nix/package.nix`,
then run `nix flake check` and rebuild the container. Include the new lockfile,
checksums, and hash in the same change. Run `nix fmt` after editing Nix files.

Use `nix flake update nixpkgs` to update the pinned system packages, then repeat
the build and container smoke test. Keep the committed Yarn version aligned
with `packageManager` when updating Yarn.
