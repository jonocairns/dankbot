const assert = require("node:assert/strict");
const { mock, test } = require("node:test");
const { Client, Collection, Events } = require("discord.js");
const security = require("../dist/security");

test("production handlers apply shared AI guards and contain reply failures", async (t) => {
	let client;
	let calls;
	let run;
	const fakeCommands = Object.fromEntries(
		["ask", "img", "meme"].map((id) => [
			id,
			{
				id,
				register: {},
				run: (...args) => {
					calls.push(id);
					return run(...args);
				},
			},
		]),
	);
	const overrideModule = (path, exports) => {
		const id = require.resolve(path);
		require.cache[id] = { id, filename: id, loaded: true, exports };
	};
	overrideModule("../dist/commands", fakeCommands);
	overrideModule("../dist/ai", {
		ai: (...args) => {
			calls.push("mention");
			return run(...args);
		},
	});
	overrideModule("../dist/getVariables", {
		getVariables: () => ({ appId: "app", token: "test" }),
	});
	mock.method(require("dotenv"), "config", () => ({ parsed: {} }));
	mock.method(require("../dist/util"), "readFiles", async () => undefined);
	mock.method(require("../dist/logger").logger, "info", () => undefined);
	mock.method(require("../dist/logger").logger, "error", () => undefined);
	mock.method(Client.prototype, "login", async function () {
		client = this;
		this.application = { id: "bot" };
		return "test";
	});
	require("../dist/index");
	const onCommand = client.listeners(Events.InteractionCreate)[0];
	const onMention = client.listeners(Events.MessageCreate)[0];
	const originalUsers = process.env.AI_ALLOWED_USER_IDS;
	const originalGuilds = process.env.AI_ALLOWED_GUILD_IDS;

	function reset() {
		delete process.env.AI_ALLOWED_USER_IDS;
		delete process.env.AI_ALLOWED_GUILD_IDS;
		security.aiRequestLimiter = new security.AIRequestLimiter();
		calls = [];
		run = async () => undefined;
	}
	function interaction(commandName, userId = "user") {
		return {
			commandName,
			user: { id: userId },
			guildId: "server",
			deferred: false,
			isChatInputCommand: () => true,
			inGuild: () => true,
			async deferReply() {
				this.deferred = true;
			},
			editReply: mock.fn(async () => undefined),
		};
	}
	function message(userId = "user") {
		return {
			author: { id: userId, bot: false },
			guildId: "server",
			inGuild: () => true,
			mentions: { members: new Collection([["bot", { id: "bot" }]]) },
			reply: mock.fn(async () => undefined),
		};
	}

	try {
		await t.test(
			"allowlists block both paid commands and mentions before provider work",
			async () => {
				reset();
				process.env.AI_ALLOWED_USER_IDS = "someone-else";
				for (const command of ["ask", "img"]) {
					const request = interaction(command);
					await onCommand(request);
					assert.match(
						request.editReply.mock.calls[0].arguments[0],
						/not enabled/,
					);
				}
				const mention = message();
				await onMention(mention);
				assert.match(
					mention.reply.mock.calls[0].arguments[0].content,
					/not enabled/,
				);
				assert.deepEqual(calls, []);
			},
		);

		await t.test(
			"a running image request blocks the same user's ask and mention",
			async () => {
				reset();
				let finish;
				run = () =>
					new Promise((resolve) => {
						finish = resolve;
					});
				const image = onCommand(interaction("img"));
				await Promise.resolve();
				await onCommand(interaction("ask"));
				await onMention(message());
				assert.deepEqual(calls, ["img"]);
				finish();
				await image;
				run = async () => undefined;
				await onCommand(interaction("ask"));
				assert.deepEqual(calls, ["img", "ask"]);
			},
		);

		await t.test(
			"provider and Discord reply failures release the request slot",
			async () => {
				reset();
				run = async () => {
					throw new Error("provider unavailable");
				};
				const request = interaction("ask");
				request.editReply = async () => {
					throw new Error("missing channel permissions");
				};
				await onCommand(request);
				const mention = message();
				mention.reply = async () => {
					throw new Error("missing channel permissions");
				};
				await onMention(mention);
				run = async () => undefined;
				await onCommand(interaction("img"));
				assert.deepEqual(calls, ["ask", "mention", "img"]);
			},
		);

		await t.test(
			"failed interaction acknowledgement never starts a provider request",
			async () => {
				reset();
				const request = interaction("ask");
				request.deferReply = async () => {
					throw new Error("interaction expired");
				};
				await onCommand(request);
				assert.deepEqual(calls, []);
			},
		);
	} finally {
		await client.destroy();
		mock.restoreAll();
		for (const [key, original] of [
			["AI_ALLOWED_USER_IDS", originalUsers],
			["AI_ALLOWED_GUILD_IDS", originalGuilds],
		]) {
			if (original === undefined) delete process.env[key];
			else process.env[key] = original;
		}
	}
});
