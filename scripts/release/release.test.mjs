import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
	assertTagSource,
	checkoutQualitySource,
	publishRelease,
	resolveQualitySource,
	resolveRelease,
	stableRelease,
	tagCommit,
	validateReleaseVersions,
} from "./release.mjs";

const sourceSha = "a".repeat(40);
const testedSha = "b".repeat(40);
const tagObjectSha = "c".repeat(40);
const tag = "v1.0.2";
const repository = "owner/dankbot";
const digest = `sha256:${"d".repeat(64)}`;
const mergedPrs =
	"pulls?state=closed&base=master&sort=updated&direction=desc&per_page=100&page=1";
const pendingPr = {
	number: 42,
	merged_at: "2026-09-27",
	base: { ref: "master" },
	head: { ref: "release-please--branches--master--components--dankbot" },
	merge_commit_sha: sourceSha,
	labels: [{ name: "autorelease: pending" }],
};
const taggedPr = { ...pendingPr, labels: [{ name: "autorelease: tagged" }] };

function mockGitHub(overrides = {}) {
	const responses = {
		[mergedPrs]: [pendingPr],
		"git/ref/heads/master": { object: { sha: testedSha } },
		[`compare/${sourceSha}...${testedSha}`]: { status: "ahead" },
		[`git/ref/tags/${tag}`]: { object: { type: "tag", sha: tagObjectSha } },
		[`git/tags/${tagObjectSha}`]: {
			object: { type: "commit", sha: sourceSha },
		},
		"release view": { tagName: tag, isPrerelease: false, isDraft: true },
		[`commits/${sourceSha}/pulls`]: [taggedPr],
		[`contents/.release-please-manifest.json?ref=${sourceSha}`]: {
			content: Buffer.from(JSON.stringify({ ".": "1.0.2" })).toString("base64"),
		},
		...overrides,
	};
	return (binary, args) => {
		assert.equal(binary, "gh");
		const key =
			args[0] === "api"
				? args[1].slice(`repos/${repository}/`.length)
				: `${args[0]} ${args[1]}`;
		assert(Object.hasOwn(responses, key), `Unexpected GitHub request: ${key}`);
		return JSON.stringify(responses[key]);
	};
}

function resolve(overrides = {}, recoveryTag = "") {
	return resolveRelease({
		repository,
		testedSha,
		tag: recoveryTag,
		run: mockGitHub(overrides),
	});
}

test("a failed GitHub lookup never authorizes release creation or recovery", () => {
	for (const recoveryTag of ["", tag]) {
		assert.throws(
			() =>
				resolveRelease({
					repository,
					testedSha,
					tag: recoveryTag,
					run: () => {
						throw new Error("GitHub unavailable");
					},
				}),
			/GitHub unavailable/,
		);
	}
});

function qualitySource(
	requestedSha = sourceSha,
	overrides = {},
	workflowRef = "refs/heads/master",
) {
	return resolveQualitySource({
		repository,
		workflowSha: testedSha,
		workflowRef,
		requestedSha,
		run: mockGitHub({
			[`compare/${sourceSha}...${testedSha}`]: {
				status: "ahead",
				merge_base_commit: { sha: sourceSha },
			},
			...overrides,
		}),
	});
}

test("ordinary PR quality checks use the workflow merge commit without accepting caller code", () => {
	assert.equal(qualitySource("", {}, "refs/pull/308/merge"), testedSha);
});

test("explicit quality checks accept a verified ancestor of the workflow master commit", () => {
	assert.equal(qualitySource(), sourceSha);
});

test("explicit quality checks reject non-master workflows and mutable refs", () => {
	assert.throws(
		() => qualitySource(sourceSha, {}, "refs/pull/308/merge"),
		/immutable commit on master/,
	);
	assert.throws(() => qualitySource("master"), /immutable commit on master/);
});

test("explicit quality checks reject newer and divergent commits", () => {
	for (const status of ["behind", "diverged"]) {
		assert.throws(
			() =>
				qualitySource(sourceSha, {
					[`compare/${sourceSha}...${testedSha}`]: { status },
				}),
			/tested master history/,
		);
	}
});

test("quality checks reject mismatched verification output", () => {
	assert.throws(
		() =>
			qualitySource(sourceSha, {
				[`compare/${sourceSha}...${testedSha}`]: {
					status: "ahead",
					merge_base_commit: { sha: testedSha },
				},
			}),
		/verified quality source/,
	);
});

test("quality source checkout validates ancestry before fetching and checks the fetched SHA", () => {
	const commands = [];
	const run = (binary, args) => {
		if (binary === "gh")
			return mockGitHub({
				[`compare/${sourceSha}...${testedSha}`]: {
					status: "ahead",
					merge_base_commit: { sha: sourceSha },
				},
			})(binary, args);
		commands.push(args);
		return args[1] === "HEAD" ? testedSha : sourceSha;
	};
	checkoutQualitySource({
		repository,
		workflowSha: testedSha,
		workflowRef: "refs/heads/master",
		requestedSha: sourceSha,
		run,
	});
	assert.deepEqual(commands, [
		["rev-parse", "HEAD"],
		["fetch", "--no-tags", "--depth=1", "origin", sourceSha],
		["rev-parse", "FETCH_HEAD"],
		["checkout", "--detach", sourceSha],
	]);
});

test("quality source checkout rejects a fetched SHA mismatch before checkout", () => {
	const commands = [];
	const run = (binary, args) => {
		if (binary === "gh")
			return mockGitHub({
				[`compare/${sourceSha}...${testedSha}`]: {
					status: "ahead",
					merge_base_commit: { sha: sourceSha },
				},
			})(binary, args);
		commands.push(args);
		return testedSha;
	};
	assert.throws(
		() =>
			checkoutQualitySource({
				repository,
				workflowSha: testedSha,
				workflowRef: "refs/heads/master",
				requestedSha: sourceSha,
				run,
			}),
		/fetched quality source/,
	);
	assert.equal(
		commands.some((args) => args[0] === "checkout"),
		false,
	);
});

test("ordinary PR checkout retains its workflow merge commit without fetching", () => {
	const commands = [];
	checkoutQualitySource({
		repository,
		workflowSha: testedSha,
		workflowRef: "refs/pull/308/merge",
		run: (binary, args) => {
			assert.equal(binary, "git");
			commands.push(args);
			return testedSha;
		},
	});
	assert.deepEqual(commands, [["rev-parse", "HEAD"]]);
});

function fixture(t) {
	const directory = mkdtempSync(path.join(os.tmpdir(), "dankbot-release-"));
	t.after(() => rmSync(directory, { recursive: true, force: true }));
	writeFileSync(
		path.join(directory, "package.json"),
		JSON.stringify({ version: "1.0.2" }),
	);
	writeFileSync(
		path.join(directory, ".release-please-manifest.json"),
		JSON.stringify({ ".": "1.0.2" }),
	);
	return directory;
}

test("a pending release merged before a later tested master commit is still released", () => {
	assert.deepEqual(resolve(), {
		sha: sourceSha,
		tag: "",
		create: true,
		update: false,
		build: false,
	});
});

test("a pending release on the second page is discovered for blank-tag recovery", () => {
	const ordinaryPr = { ...taggedPr, head: { ref: "ordinary-feature" } };
	assert.deepEqual(
		resolve({
			[mergedPrs]: Array.from({ length: 100 }, () => ordinaryPr),
			[mergedPrs.replace("&page=1", "&page=2")]: [pendingPr],
		}),
		{ sha: sourceSha, tag: "", create: true, update: false, build: false },
	);
});

test("pagination detects multiple pending releases across page boundaries", () => {
	assert.throws(
		() =>
			resolve({
				[mergedPrs]: [pendingPr, ...Array.from({ length: 99 }, () => taggedPr)],
				[mergedPrs.replace("&page=1", "&page=2")]: [
					{ ...pendingPr, number: 43 },
				],
			}),
		/Multiple pending/,
	);
});

test("a full final page is followed by an empty page before PR maintenance", () => {
	assert.equal(
		resolve({
			[mergedPrs]: Array.from({ length: 100 }, () => taggedPr),
			[mergedPrs.replace("&page=1", "&page=2")]: [],
		}).update,
		true,
	);
});

test("the original release run remains valid when master has advanced", () => {
	const run = mockGitHub({
		[`compare/${sourceSha}...${sourceSha}`]: { status: "identical" },
	});
	assert.equal(
		resolveRelease({ repository, testedSha: sourceSha, run }).create,
		true,
	);
});

test("a pending release newer than this run waits for its own tested history", () => {
	assert.equal(
		resolve({ [`compare/${sourceSha}...${testedSha}`]: { status: "behind" } })
			.create,
		false,
	);
});

test("divergent pending release history fails closed", () => {
	assert.throws(
		() =>
			resolve({
				[`compare/${sourceSha}...${testedSha}`]: { status: "diverged" },
			}),
		/tested master history/,
	);
});

test("multiple pending release PRs fail rather than testing only one and releasing both", () => {
	assert.throws(
		() => resolve({ [mergedPrs]: [pendingPr, { ...pendingPr, number: 43 }] }),
		/Multiple pending/,
	);
});

test("PR maintenance proceeds only for the current master commit without a pending release", () => {
	assert.equal(resolve({ [mergedPrs]: [] }).update, true);
	assert.equal(
		resolve({
			[mergedPrs]: [],
			"git/ref/heads/master": { object: { sha: sourceSha } },
		}).update,
		false,
	);
});

test("labels on unrelated branches do not grant release provenance", () => {
	assert.equal(
		resolve({
			[mergedPrs]: [{ ...pendingPr, head: { ref: "ordinary-feature" } }],
		}).create,
		false,
	);
});

test("unmerged or unlabelled release branches are not pending releases", () => {
	assert.equal(
		resolve({ [mergedPrs]: [{ ...pendingPr, merged_at: null }] }).create,
		false,
	);
	assert.equal(resolve({ [mergedPrs]: [taggedPr] }).create, false);
});

test("recovery resolves an annotated tag to a pipeline release commit on master", () => {
	assert.deepEqual(resolve({}, tag), {
		sha: sourceSha,
		tag,
		create: false,
		update: false,
		build: true,
	});
});

test("recovery resolution does not require draft release visibility", () => {
	const run = mockGitHub();
	const readOnly = (binary, args) => {
		assert.notEqual(
			`${args[0]} ${args[1]}`,
			"release view",
			"Draft releases are invisible to read-only tokens",
		);
		return run(binary, args);
	};
	assert.equal(
		resolveRelease({ repository, testedSha, tag, run: readOnly }).build,
		true,
	);
});

test("draft releases are accepted through the CLI lookup used during staged builds", () => {
	assert.equal(stableRelease(repository, tag, mockGitHub()).isDraft, true);
});

test("lightweight tags are resolved without annotation requests", () => {
	assert.equal(
		tagCommit(
			repository,
			tag,
			mockGitHub({
				[`git/ref/tags/${tag}`]: { object: { type: "commit", sha: sourceSha } },
			}),
		),
		sourceSha,
	);
});

test("source checks reject missing identities and tags moved after resolution", () => {
	assertTagSource(repository, tag, sourceSha, mockGitHub());
	assert.throws(
		() => assertTagSource(repository, tag, testedSha, mockGitHub()),
		/verified immutable/,
	);
	assert.throws(
		() => assertTagSource(repository, tag, "", mockGitHub()),
		/verified immutable/,
	);
});

test("recovery rejects malformed tags before requesting or checking out source", () => {
	assert.throws(() => resolve({}, "beta"), /stable vX.Y.Z/);
});

test("recovery rejects a tag outside master history", () => {
	assert.throws(
		() =>
			resolve(
				{ [`compare/${sourceSha}...${testedSha}`]: { status: "diverged" } },
				tag,
			),
		/tested master history/,
	);
});

test("recovery rejects moved tags even if package versions could match", () => {
	assert.throws(
		() =>
			resolve(
				{
					[`commits/${sourceSha}/pulls`]: [
						{ ...taggedPr, merge_commit_sha: testedSha },
					],
				},
				tag,
			),
		/moved tags/,
	);
});

test("recovery rejects a tag without a merged tagged Release Please PR", () => {
	assert.throws(
		() => resolve({ [`commits/${sourceSha}/pulls`]: [] }, tag),
		/historical/,
	);
	assert.throws(
		() =>
			resolve(
				{ [`commits/${sourceSha}/pulls`]: [{ ...taggedPr, labels: [] }] },
				tag,
			),
		/historical/,
	);
});

test("staged builds reject prereleases and mismatched tag metadata", () => {
	for (const release of [
		{ tagName: tag, isPrerelease: true },
		{ tagName: "v1.0.3", isPrerelease: false },
	]) {
		assert.throws(
			() =>
				stableRelease(repository, tag, mockGitHub({ "release view": release })),
			/stable release/,
		);
	}
});

test("recovery requires the manifest version to match the requested tag", () => {
	const manifest = {
		content: Buffer.from(JSON.stringify({ ".": "1.4.20" })).toString("base64"),
	};
	assert.throws(
		() =>
			resolve(
				{
					[`contents/.release-please-manifest.json?ref=${sourceSha}`]: manifest,
				},
				tag,
			),
		/manifest must match/,
	);
});

test("version checks accept synchronized pipeline releases", (t) => {
	validateReleaseVersions(fixture(t), "1.0.2");
});

test("legacy releases receive an actionable unsupported recovery error", (t) => {
	const directory = fixture(t);
	rmSync(path.join(directory, ".release-please-manifest.json"));
	assert.throws(
		() => validateReleaseVersions(directory, "1.0.1"),
		/historical releases are unsupported/,
	);
});

test("version checks reject stale package and manifest versions", (t) => {
	const directory = fixture(t);
	assert.throws(
		() => validateReleaseVersions(directory, "1.0.3"),
		/manifest does not match/,
	);
	writeFileSync(
		path.join(directory, "package.json"),
		JSON.stringify({ version: "1.4.20" }),
	);
	assert.throws(
		() => validateReleaseVersions(directory, "1.0.2"),
		/package.json/,
	);
});

test("publication completes GitHub availability before promoting the immutable Docker image", async () => {
	const calls = [];
	await publishRelease({
		repository,
		tag,
		image: "ghcr.io/owner/dankbot",
		digest,
		run: (binary, args) => calls.push([binary, args]),
	});
	assert.equal(calls[0][0], "gh");
	assert.deepEqual(calls[1], [
		"docker",
		[
			"buildx",
			"imagetools",
			"create",
			"--tag",
			"ghcr.io/owner/dankbot:latest",
			`ghcr.io/owner/dankbot@${digest}`,
		],
	]);
});

test("GitHub failure never changes Docker latest", async () => {
	let attempts = 0;
	await assert.rejects(
		publishRelease({
			repository,
			tag,
			image: "image",
			digest,
			pause: async () => undefined,
			run: (binary) => {
				assert.equal(binary, "gh");
				attempts++;
				throw new Error("GitHub unavailable");
			},
		}),
		/GitHub unavailable/,
	);
	assert.equal(attempts, 3);
});

test("transient failures in each publication service retry and converge", async () => {
	const attempts = { gh: 0, docker: 0 };
	const delays = [];
	await publishRelease({
		repository,
		tag,
		image: "image",
		digest,
		pause: async (ms) => delays.push(ms),
		run: (binary) => {
			attempts[binary]++;
			if (attempts[binary] < 3) throw new Error("Temporary failure");
		},
	});
	assert.deepEqual(attempts, { gh: 3, docker: 3 });
	assert.deepEqual(delays, [1000, 2000, 1000, 2000]);
});

test("permanent Docker failure preserves available GitHub assets and a rerun completes publication", async () => {
	let published = false;
	let promoted = false;
	const options = {
		repository,
		tag,
		image: "image",
		digest,
		pause: async () => undefined,
	};
	await assert.rejects(
		publishRelease({
			...options,
			run: (binary) => {
				if (binary === "gh") published = true;
				else throw new Error("Registry unavailable");
			},
		}),
		/Re-run the failed publish job/,
	);
	assert.equal(published, true);
	await publishRelease({
		...options,
		run: (binary) => {
			if (binary === "docker") {
				assert.equal(published, true);
				promoted = true;
			}
		},
	});
	assert.equal(promoted, true);
});

test("invalid publication inputs fail before either service changes", async () => {
	const run = () => assert.fail("No publication operation should run");
	await assert.rejects(
		publishRelease({ repository, tag: "beta", image: "image", digest, run }),
		/stable/,
	);
	await assert.rejects(
		publishRelease({ repository, tag, image: "image", digest: "latest", run }),
		/immutable/,
	);
});
