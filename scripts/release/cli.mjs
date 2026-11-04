import { fileURLToPath } from "node:url";
import {
	api,
	assertTagSource,
	checkoutQualitySource,
	command,
	output,
	publishRelease,
	resolveQualitySource,
	resolveRelease,
	stableRelease,
	validateReleaseTag,
	validateReleaseVersions,
} from "./release.mjs";

const directory = process.env.RELEASE_SOURCE_DIR || process.cwd();
const repository = process.env.GITHUB_REPOSITORY;
const tag = process.env.RELEASE_TAG;

switch (process.argv[2]) {
	case "checkout-quality":
		checkoutQualitySource({
			repository,
			workflowSha: process.env.GITHUB_SHA,
			workflowRef: process.env.GITHUB_REF,
			requestedSha: process.env.QUALITY_SOURCE_SHA,
		});
		break;
	case "quality-source":
		output({
			sha: resolveQualitySource({
				repository,
				workflowSha: process.env.GITHUB_SHA,
				workflowRef: process.env.GITHUB_REF,
				requestedSha: process.env.QUALITY_SOURCE_SHA,
			}),
		});
		break;
	case "resolve": {
		const result = resolveRelease({
			repository,
			testedSha: process.env.GITHUB_SHA,
			tag: process.env.RECOVERY_TAG,
		});
		output({
			sha: result.sha,
			tag: result.tag,
			create: result.create,
			update: result.update,
			build: result.build,
		});
		break;
	}
	case "verify": {
		validateReleaseTag(tag);
		const expectedSha = process.env.EXPECTED_SHA;
		const sha = command("git", ["-C", directory, "rev-parse", "HEAD"]);
		if (!expectedSha || sha !== expectedSha) {
			throw new Error(
				"The checkout and release tag must match the verified source commit.",
			);
		}
		assertTagSource(repository, tag, expectedSha);
		stableRelease(repository, tag);
		validateReleaseVersions(directory, tag.slice(1));
		output({ version: tag.slice(1), tag });
		break;
	}
	case "publish":
		assertTagSource(repository, tag, process.env.EXPECTED_SHA);
		await publishRelease({
			repository,
			tag,
			image: process.env.IMAGE,
			digest: process.env.IMAGE_DIGEST,
		});
		break;
	case "check-current":
		output({
			current:
				api(repository, "git/ref/heads/master").object.sha ===
				process.env.GITHUB_SHA,
		});
		break;
	default:
		throw new Error(
			`Unknown release operation in ${fileURLToPath(import.meta.url)}.`,
		);
}
