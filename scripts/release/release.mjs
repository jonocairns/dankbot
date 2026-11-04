import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

export function command(binary, args) {
	return execFileSync(binary, args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "inherit"],
	}).trim();
}

export function api(repository, endpoint, run = command) {
	return JSON.parse(run("gh", ["api", `repos/${repository}/${endpoint}`]));
}

export function assertAncestor(comparison) {
	if (comparison.status !== "identical" && comparison.status !== "ahead") {
		throw new Error("The release commit must be on the tested master history.");
	}
}

export function resolveQualitySource({
	repository,
	workflowSha,
	workflowRef,
	requestedSha = "",
	run = command,
}) {
	if (!/^[a-f0-9]{40}$/.test(workflowSha)) {
		throw new Error("Expected a full workflow commit SHA.");
	}
	if (!requestedSha) return workflowSha;
	if (
		workflowRef !== "refs/heads/master" ||
		!/^[a-f0-9]{40}$/.test(requestedSha)
	) {
		throw new Error(
			"An explicit quality source must be an immutable commit on master.",
		);
	}
	const comparison = api(
		repository,
		`compare/${requestedSha}...${workflowSha}`,
		run,
	);
	assertAncestor(comparison);
	if (comparison.merge_base_commit?.sha !== requestedSha) {
		throw new Error(
			"The verified quality source must match the requested commit.",
		);
	}
	return comparison.merge_base_commit.sha;
}

export function checkoutQualitySource(options) {
	const run = options.run || command;
	const sha = resolveQualitySource(options);
	if (run("git", ["rev-parse", "HEAD"]) === sha) return;
	run("git", ["fetch", "--no-tags", "--depth=1", "origin", sha]);
	if (run("git", ["rev-parse", "FETCH_HEAD"]) !== sha) {
		throw new Error(
			"The fetched quality source must match the verified commit.",
		);
	}
	run("git", ["checkout", "--detach", sha]);
}

export function validateReleaseTag(tag) {
	if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
		throw new Error("Expected a stable vX.Y.Z release tag.");
	}
}

export function validateReleaseVersions(directory, version) {
	let manifest;
	try {
		manifest = JSON.parse(
			readFileSync(
				path.join(directory, ".release-please-manifest.json"),
				"utf8",
			),
		);
	} catch {
		throw new Error(
			"Recovery supports only releases created by this pipeline; historical releases are unsupported.",
		);
	}
	if (manifest["."] !== version)
		throw new Error("Release manifest does not match the requested version.");
	const pkg = JSON.parse(
		readFileSync(path.join(directory, "package.json"), "utf8"),
	);
	if (pkg.version !== version)
		throw new Error("Version mismatch in package.json.");
}

export function tagCommit(repository, tag, run = command) {
	validateReleaseTag(tag);
	let reference = api(repository, `git/ref/tags/${tag}`, run).object;
	for (let depth = 0; reference.type === "tag" && depth < 5; depth++) {
		reference = api(repository, `git/tags/${reference.sha}`, run).object;
	}
	if (reference.type !== "commit" || !/^[a-f0-9]{40}$/.test(reference.sha)) {
		throw new Error("The release tag must resolve to a commit.");
	}
	return reference.sha;
}

export function assertTagSource(repository, tag, expectedSha, run = command) {
	if (!expectedSha || tagCommit(repository, tag, run) !== expectedSha) {
		throw new Error(
			"The release tag must match the verified immutable source commit.",
		);
	}
}

export function mergedReleasePrs(repository, label, run = command) {
	// Label filters route `gh pr list` through the search index, which can lag
	// behind the merge push that triggered this run. List PRs directly instead.
	// Project only the fields used below; full PR bodies overflow execFileSync's buffer.
	const prs = [];
	for (let page = 1; ; page++) {
		const batch = JSON.parse(
			run("gh", [
				"api",
				`repos/${repository}/pulls?state=closed&base=master&sort=updated&direction=desc&per_page=100&page=${page}`,
				"--jq",
				"map({merged_at, merge_commit_sha, head: {ref: .head.ref}, labels: [.labels[] | {name}]})",
			]),
		);
		prs.push(...batch);
		if (batch.length < 100) break;
	}
	return prs.filter(
		(pr) =>
			pr.merged_at &&
			/^[a-f0-9]{40}$/.test(pr.merge_commit_sha ?? "") &&
			pr.head?.ref?.startsWith("release-please--branches--master") &&
			pr.labels?.some((prLabel) => prLabel.name === label),
	);
}

export function stableRelease(repository, tag, run = command) {
	// gh also finds drafts; the REST releases/tags endpoint only finds published releases.
	const release = JSON.parse(
		run("gh", [
			"release",
			"view",
			tag,
			"--repo",
			repository,
			"--json",
			"tagName,isPrerelease,isDraft",
		]),
	);
	if (release.tagName !== tag || release.isPrerelease) {
		throw new Error("Expected an existing stable release.");
	}
	return release;
}

export function resolveRelease({
	repository,
	testedSha,
	tag = "",
	run = command,
}) {
	if (!/^[a-f0-9]{40}$/.test(testedSha)) {
		throw new Error("Expected a full tested commit SHA.");
	}
	if (tag) {
		const sha = tagCommit(repository, tag, run);
		assertAncestor(api(repository, `compare/${sha}...${testedSha}`, run));
		// Draft releases are invisible to this read-only token; the build job's
		// verify step checks the release with write access before any upload.
		const prs = api(repository, `commits/${sha}/pulls`, run);
		if (
			!prs.some(
				(pr) =>
					pr.merged_at &&
					pr.base?.ref === "master" &&
					pr.head?.ref?.startsWith("release-please--branches--master") &&
					pr.merge_commit_sha === sha &&
					pr.labels?.some((label) => label.name === "autorelease: tagged"),
			)
		) {
			throw new Error(
				"Recovery requires a tag pointing at a merged Release Please PR on master; historical or moved tags are unsupported.",
			);
		}
		const manifest = api(
			repository,
			`contents/.release-please-manifest.json?ref=${sha}`,
			run,
		);
		const versions = JSON.parse(
			Buffer.from(manifest.content, "base64").toString("utf8"),
		);
		if (versions["."] !== tag.slice(1)) {
			throw new Error(
				"The tagged release manifest must match the requested tag.",
			);
		}
		return { sha, tag, create: false, update: false, build: true };
	}
	const pending = mergedReleasePrs(repository, "autorelease: pending", run);
	if (pending.length > 1) {
		throw new Error(
			"Multiple pending release PRs require investigation before publication.",
		);
	}
	if (pending.length === 1) {
		const sha = pending[0].merge_commit_sha;
		const comparison = api(repository, `compare/${sha}...${testedSha}`, run);
		if (comparison.status === "behind") {
			return {
				sha: testedSha,
				tag: "",
				create: false,
				update: false,
				build: false,
			};
		}
		assertAncestor(comparison);
		return { sha, tag: "", create: true, update: false, build: false };
	}
	const masterSha = api(repository, "git/ref/heads/master", run).object.sha;
	return {
		sha: testedSha,
		tag: "",
		create: false,
		update: masterSha === testedSha,
		build: false,
	};
}

export async function retry(
	operation,
	pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
	for (let attempt = 0; ; attempt++) {
		try {
			return await operation();
		} catch (error) {
			if (attempt === 2) throw error;
			await pause(1000 * 2 ** attempt);
		}
	}
}

export async function publishRelease({
	repository,
	tag,
	image,
	digest,
	run = command,
	pause,
}) {
	validateReleaseTag(tag);
	if (!/^sha256:[a-f0-9]{64}$/.test(digest)) {
		throw new Error("Expected an immutable container digest.");
	}
	// GitHub must be available before Docker users can receive this release.
	await retry(
		() =>
			run("gh", [
				"release",
				"edit",
				tag,
				"--repo",
				repository,
				"--draft=false",
				"--latest",
			]),
		pause,
	);
	try {
		await retry(
			() =>
				run("docker", [
					"buildx",
					"imagetools",
					"create",
					"--tag",
					`${image}:latest`,
					`${image}@${digest}`,
				]),
			pause,
		);
	} catch (error) {
		throw new Error(
			"GitHub publication succeeded but Docker promotion failed. Re-run the failed publish job to complete promotion; the GitHub release remains available.",
			{ cause: error },
		);
	}
}

export function output(values, destination = process.env.GITHUB_OUTPUT) {
	if (!destination) throw new Error("GITHUB_OUTPUT is required.");
	for (const [key, value] of Object.entries(values)) {
		if (String(value).includes("\n"))
			throw new Error("Invalid workflow output.");
		appendFileSync(destination, `${key}=${value}\n`);
	}
}
