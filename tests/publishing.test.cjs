const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const testedSha = "a".repeat(40);
const script = path.resolve(
	__dirname,
	"../.github/scripts/check-publish-head.sh",
);

function checkHead(currentSha, apiExit = 0) {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), "dankbot-publishing-"),
	);
	const output = path.join(directory, "output");
	try {
		fs.writeFileSync(
			path.join(directory, "gh"),
			`#!/usr/bin/env bash
set -euo pipefail
[[ "$*" == "api repos/jonocairns/dankbot/git/ref/heads/master --jq .object.sha" ]]
echo "$STUB_CURRENT_SHA"
exit "$STUB_API_EXIT"
`,
			{ mode: 0o755 },
		);
		const result = spawnSync("bash", [script], {
			encoding: "utf8",
			env: {
				...process.env,
				PATH: `${directory}${path.delimiter}${process.env.PATH}`,
				GITHUB_REPOSITORY: "jonocairns/dankbot",
				GITHUB_OUTPUT: output,
				TESTED_SHA: testedSha,
				STUB_CURRENT_SHA: currentSha,
				STUB_API_EXIT: String(apiExit),
			},
		});
		return {
			...result,
			output: fs.existsSync(output) ? fs.readFileSync(output, "utf8") : "",
		};
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
}

test("the current master commit is eligible to publish", () => {
	const result = checkHead(testedSha);
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.output.trim(), "publish=true");
});

test("an older CI run cannot replace the current production image", () => {
	const result = checkHead("b".repeat(40));
	assert.equal(result.status, 0, result.stderr);
	assert.equal(result.output.trim(), "publish=false");
	assert.match(result.stdout, /Skipping superseded commit/);
});

test("a failed head lookup never authorizes publishing", () => {
	const result = checkHead(testedSha, 1);
	assert.notEqual(result.status, 0);
	assert.equal(result.output, "");
});
