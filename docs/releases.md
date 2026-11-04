# Releases

Dankbot follows Ripcord's Release Please flow on `master`. Release Please owns
`package.json`, `CHANGELOG.md`, and `.release-please-manifest.json`. The starting
version is the existing `1.0.1`; the bootstrap SHA excludes earlier history from
the first automated changelog. Existing four-component tags are historical and
are not used for automated release recovery.

Use conventional commit messages and PR titles: `fix:` produces a patch release,
`feat:` a minor release, and `feat!:` or a `BREAKING CHANGE:` footer a major
release. Squash merge with the conventional PR title. Do not manually bump the
version or create stable release tags.

## Repository setup

Install a dedicated release GitHub App on `jonocairns/dankbot`, with Contents,
Issues, Pull requests, and Workflows read/write permissions. Workflows permission
allows tagging an older verified commit when workflow files have since changed.
The App token lets release PRs trigger the ordinary PR checks.

Create a `release` environment restricted to the `master` branch, without
required reviewers or a wait timer. Add these environment secrets:

- `RELEASE_BOT_APP_ID`: the App's numeric ID.
- `RELEASE_BOT_PRIVATE_KEY`: the complete PEM private key.

Keep `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` as repository secrets for image
publishing. Allow GitHub Actions to create pull requests in repository settings.
No npm publication token is needed.

## Shipping

1. Merge changes into `master`. After the shared Nix quality checks and container
   smoke test pass, Release Please creates or updates its release PR.
2. Review and merge the release PR containing the version bump and changelog.
3. Automation verifies the release commit, runs quality checks against that exact
   SHA, and creates a `vX.Y.Z` tag and draft release. It builds the Nix container
   from the same SHA and tests native audio dependencies, FFmpeg decoding,
   non-root execution, and startup without contacting Discord.
4. It pushes `jonocairns/dankbot:vX.Y.Z` to Docker Hub and attaches the container
   archive to the draft. Only after those steps succeed does it publish the
   GitHub release and promote that image's immutable digest to `latest`.

The draft is an intermediate state; publication is automatic. Ordinary pushes
and PR checks do not publish an image. Developers can build images locally with
`yarn docker:build` without running release automation.

## Recovery

For transient failures, re-run failed jobs in the original **Release** run.
Alternatively, dispatch **Release** on `master` with an existing pipeline-created
`vX.Y.Z` tag. Recovery verifies the tag belongs to a merged, tagged Release Please
PR on `master` history and that package and manifest versions match. It rebuilds
the immutable source, replaces the archive, and completes publication.

Dispatch with a blank tag to maintain the release PR or finish a merged pending
release. Pending releases are discovered even after newer commits land on
`master`; unrelated newer code is never substituted for the release source.

If GitHub publication fails, Docker `latest` is unchanged. If Docker promotion
fails after GitHub publication, the release remains available; re-run the failed
publish job. Publication retries each service up to three times. Recovering an
older release promotes it to `latest`, so treat that as a rollback. Ship source
fixes as a new release instead of moving a published version tag.
