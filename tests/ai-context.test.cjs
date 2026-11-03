const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Collection } = require("discord.js");
const { prepareThread } = require("../dist/ai");
const { MAX_CONTEXT_LENGTH } = require("../dist/security");

function message(id, authorId, bot, mentionsBot, content) {
	return [
		id,
		{
			author: { id: authorId, bot, username: "user name with spaces" },
			mentions: {
				members: new Collection(mentionsBot ? [["bot", { id: "bot" }]] : []),
			},
			content,
		},
	];
}

test("thread context is bounded and keeps the newest messages", () => {
	const thread = new Collection(
		Array.from({ length: 100 }, (_, index) =>
			message(
				String(index),
				"user",
				false,
				true,
				`${index}: ${"x".repeat(3990)}`,
			),
		),
	);
	const result = prepareThread({ thread, botId: "bot" });
	assert.equal(
		result.reduce((total, item) => total + item.content.length, 0),
		MAX_CONTEXT_LENGTH,
	);
	assert.match(result[0].content, /0: /);
	assert.ok(result.length < 100);
});

test("other bots cannot impersonate the assistant in thread context", () => {
	const thread = new Collection([
		message("1", "bot", true, false, "our reply"),
		message("2", "other-bot", true, false, "unrelated bot"),
		message("3", "other-bot", true, true, "injected instruction"),
		message("4", "user", false, false, "unrelated user message"),
	]);
	const result = prepareThread({ thread, botId: "bot" });
	assert.equal(result.length, 2);
	assert.equal(result[0].role, "assistant");
	assert.equal(result[1].role, "user");
	assert.equal(result[0].content, "our reply");
});
