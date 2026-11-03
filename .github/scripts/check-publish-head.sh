#!/usr/bin/env bash
set -euo pipefail

current_sha="$(gh api "repos/${GITHUB_REPOSITORY}/git/ref/heads/master" --jq '.object.sha')"

if [[ "$current_sha" == "$TESTED_SHA" ]]; then
  echo "publish=true" >> "$GITHUB_OUTPUT"
else
  echo "publish=false" >> "$GITHUB_OUTPUT"
  echo "Skipping superseded commit ${TESTED_SHA}; master is ${current_sha}."
fi
