const assert = require("node:assert/strict");
const { afterEach, test } = require("node:test");
const { Client, MessagePayload } = require("discord.js");
const {
	AIRequestLimiter,
	ALLOWED_MENTIONS,
	RequestRejectedError,
	MAX_PROMPT_LENGTH,
	validatePrompt,
} = require("../dist/security");

const originalGuilds = process.env.AI_ALLOWED_GUILD_IDS;
const originalUsers = process.env.AI_ALLOWED_USER_IDS;
afterEach(() => {
	for (const [name, original] of [
		["AI_ALLOWED_GUILD_IDS", originalGuilds],
		["AI_ALLOWED_USER_IDS", originalUsers],
	]) {
		if (original === undefined) delete process.env[name];
		else process.env[name] = original;
	}
});

function limiter(now = Date.now) {
	delete process.env.AI_ALLOWED_GUILD_IDS;
	delete process.env.AI_ALLOWED_USER_IDS;
	return new AIRequestLimiter(now);
}
const requester = (userId, guildId = "server") => ({ userId, guildId });

test("paid requests enforce per-user and global concurrency, including across guilds", () => {
	const guard = limiter();
	const release = guard.acquire(requester("a"));
	assert.throws(
		() => guard.acquire(requester("a", "other-server")),
		RequestRejectedError,
	);
	guard.acquire(requester("b"));
	guard.acquire(requester("c"));
	assert.throws(() => guard.acquire(requester("d")), RequestRejectedError);
	release();
	const releaseAgain = guard.acquire(requester("a"));
	release(); // A stale cleanup must not release the newer request.
	assert.throws(() => guard.acquire(requester("a")), RequestRejectedError);
	releaseAgain();
});

test("rolling per-user and bot-wide budgets expire after a minute", () => {
	let now = 1000;
	const guard = limiter(() => now);
	for (let i = 0; i < 5; i++) guard.acquire(requester("a"))();
	assert.throws(() => guard.acquire(requester("a")), RequestRejectedError);
	for (let i = 0; i < 15; i++) guard.acquire(requester(`user-${i}`))();
	assert.throws(
		() => guard.acquire(requester("new-user")),
		RequestRejectedError,
	);
	now += 59999;
	assert.throws(() => guard.acquire(requester("a")), RequestRejectedError);
	now++;
	guard.acquire(requester("a"))();
});

test("guild and user allowlists both apply, and direct messages are rejected", () => {
	const guard = limiter();
	process.env.AI_ALLOWED_GUILD_IDS = " server, other-server ";
	process.env.AI_ALLOWED_USER_IDS = " allowed-user ";
	assert.throws(
		() => guard.acquire(requester("allowed-user", null)),
		RequestRejectedError,
	);
	assert.throws(
		() => guard.acquire(requester("allowed-user", "unapproved")),
		RequestRejectedError,
	);
	assert.throws(
		() => guard.acquire(requester("unapproved")),
		RequestRejectedError,
	);
	guard.acquire(requester("allowed-user"))();
});

test("blank and oversized prompts are rejected before provider calls", () => {
	assert.throws(() => validatePrompt(" \n "), RequestRejectedError);
	assert.throws(
		() => validatePrompt("x".repeat(MAX_PROMPT_LENGTH + 1)),
		RequestRejectedError,
	);
	validatePrompt("x".repeat(MAX_PROMPT_LENGTH));
});

test("Discord serializes user, role, everyone and reply notifications as disabled", async () => {
	const client = new Client({ intents: [], allowedMentions: ALLOWED_MENTIONS });
	try {
		const payload = await new MessagePayload(
			{ client },
			{ content: "@everyone <@123456789012345678> <@&123456789012345678>" },
		).resolveBody();
		assert.deepEqual(payload.body.allowed_mentions, {
			parse: [],
			replied_user: false,
		});
	} finally {
		await client.destroy();
	}
});
