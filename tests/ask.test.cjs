const assert = require("node:assert/strict");
const http = require("node:http");
const { once } = require("node:events");
const { setImmediate: immediate } = require("node:timers/promises");
const { after, before, beforeEach, mock, test } = require("node:test");
const { MessageFlags } = require("discord.js");

const overrideModule = (path, exports) => {
	const id = require.resolve(path);
	require.cache[id] = { id, filename: id, loaded: true, exports };
};
let playAudio;
overrideModule("../dist/getPlayer", {
	UNABLE_TO_CONNECT_ERROR: "no voice",
	playAudio: (...args) => playAudio(...args),
});
overrideModule("../dist/config", {
	getAIModel: () => "test-model",
	getTTSProvider: () => "openai",
	getPiperConnection: () => ({ host: "127.0.0.1", port: 1 }),
});
mock.method(require("../dist/logger").logger, "info", () => undefined);
mock.method(require("../dist/logger").logger, "error", () => undefined);
const { ask } = require("../dist/commands/ask");
const {
	AI_TIMEOUT_MS,
	AIRequestLimiter,
	MAX_COMPLETION_TOKENS,
} = require("../dist/security");

// A local stand-in for the OpenAI API, so the real SDK and fetch are exercised.
let server;
let routes;
let requests;
const sockets = new Set();
before(async () => {
	server = http.createServer(async (req, res) => {
		let body = "";
		for await (const chunk of req) body += chunk;
		const request = { path: req.url, body: JSON.parse(body), req, res };
		request.closed = new Promise((resolve) => res.on("close", resolve));
		requests.push(request);
		routes[req.url](request);
	});
	server.on("connection", (socket) => {
		sockets.add(socket);
		socket.on("close", () => sockets.delete(socket));
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	process.env.OPENAI_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;
	process.env.OPENAI_API_KEY = "test";
});
after(async () => {
	for (const socket of sockets) socket.destroy();
	await new Promise((resolve) => server.close(resolve));
});

const answer = (text) => (request) =>
	request.res.writeHead(200, { "content-type": "application/json" }).end(
		JSON.stringify({
			id: "chat",
			object: "chat.completion",
			created: 0,
			model: "test-model",
			choices: [
				{
					index: 0,
					finish_reason: "stop",
					message: { role: "assistant", content: text },
				},
			],
		}),
	);
const speech = (audio) => (request) =>
	request.res.writeHead(200, { "content-type": "audio/mpeg" }).end(audio);
// Sends headers and part of the body, then never finishes.
const stall = (contentType) => (request) => {
	request.res.writeHead(200, { "content-type": contentType });
	request.res.write(contentType === "application/json" ? "{" : "partial");
};

let events;
beforeEach(() => {
	requests = [];
	events = [];
	routes = {
		"/v1/chat/completions": answer("the answer"),
		"/v1/audio/speech": speech("mp3 bytes"),
	};
	playAudio = async (_interaction, input) => {
		const chunks = [];
		for await (const chunk of input) chunks.push(chunk);
		events.push(["play", Buffer.concat(chunks).toString()]);
	};
});

function interaction({ voiceChannel = "voice" } = {}) {
	return {
		options: { get: () => ({ value: "question?" }) },
		member: { voice: { channel: voiceChannel && { id: voiceChannel } } },
		editReply: async (content) => {
			events.push(["edit", content]);
		},
		followUp: async (options) => {
			events.push(["followUp", options]);
		},
	};
}

async function waitFor(condition) {
	const deadline = performance.now() + 2000;
	while (!condition()) {
		assert.ok(
			performance.now() < deadline,
			"Timed out waiting for API request",
		);
		await immediate();
	}
}

const audioFailure = [
	"followUp",
	{
		content: "I couldn't play the audio for this answer.",
		flags: MessageFlags.Ephemeral,
	},
];

test("answer text is delivered before speech is requested and then played", async () => {
	routes["/v1/audio/speech"] = (request) => {
		events.push(["speech", request.body.input]);
		speech("mp3 bytes")(request);
	};
	await ask.run(interaction());
	assert.deepEqual(events, [
		["edit", "the answer"],
		["speech", "the answer"],
		["play", "mp3 bytes"],
	]);
	assert.equal(requests[0].body.model, "test-model");
	assert.equal(requests[0].body.max_completion_tokens, MAX_COMPLETION_TOKENS);
	assert.equal(requests[0].body.messages.at(-1).content, "question?");
});

test("speech failure keeps the delivered answer and reports the audio problem", async () => {
	routes["/v1/audio/speech"] = (request) =>
		request.res
			.writeHead(500, { "content-type": "application/json" })
			.end(JSON.stringify({ error: { message: "tts down" } }));
	await ask.run(interaction());
	assert.deepEqual(events, [["edit", "the answer"], audioFailure]);
});

test("playback failure keeps the delivered answer and reports the audio problem", async () => {
	playAudio = async () => {
		throw new Error("Unable to join voice channel");
	};
	await ask.run(interaction());
	assert.deepEqual(events, [["edit", "the answer"], audioFailure]);
});

test("a failed audio notice does not escape and overwrite the answer", async () => {
	playAudio = async () => {
		throw new Error("playback failed");
	};
	const fake = interaction();
	fake.followUp = async () => {
		throw new Error("Discord unavailable");
	};
	await ask.run(fake);
	assert.deepEqual(events, [["edit", "the answer"]]);
});

test(
	"the deadline cancels playback startup while retaining the answer",
	{ timeout: 5000 },
	async (t) => {
		t.mock.timers.enable({ apis: ["setTimeout"] });
		let input;
		let signal;
		let settled = false;
		playAudio = async (_interaction, source, abortSignal) => {
			input = source;
			signal = abortSignal;
			await new Promise((_resolve, reject) => {
				signal.addEventListener(
					"abort",
					() => {
						input.destroy();
						reject(new Error("Voice playback aborted"));
					},
					{ once: true },
				);
			});
		};
		const run = ask.run(interaction()).finally(() => {
			settled = true;
		});
		await waitFor(() => signal !== undefined);
		assert.equal(settled, false);
		t.mock.timers.tick(AI_TIMEOUT_MS);
		await run;
		assert.equal(signal.aborted, true);
		assert.equal(input.destroyed, true);
		assert.deepEqual(events, [["edit", "the answer"], audioFailure]);
	},
);

test("users outside voice are told before any provider request", async () => {
	const originalKey = process.env.OPENAI_API_KEY;
	delete process.env.OPENAI_API_KEY;
	try {
		await ask.run(interaction({ voiceChannel: null }));
	} finally {
		if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
	}
	assert.deepEqual(events, [["edit", "no voice"]]);
	assert.equal(requests.length, 0);
});

test(
	"the deadline aborts a speech body that stalls after its headers, holding the request slot until then",
	{ timeout: 5000 },
	async (t) => {
		t.mock.timers.enable({ apis: ["setTimeout"] });
		routes["/v1/audio/speech"] = stall("audio/mpeg");
		const limiter = new AIRequestLimiter();
		const requester = { userId: "user", guildId: "server" };
		const release = limiter.acquire(requester);
		let settled = false;
		const run = ask
			.run(interaction())
			.finally(release)
			.finally(() => {
				settled = true;
			});

		await waitFor(() => requests.length === 2);
		await new Promise((resolve) => setImmediate(resolve));
		assert.equal(settled, false);
		assert.throws(() => limiter.acquire(requester), /busy/);

		t.mock.timers.tick(AI_TIMEOUT_MS);
		await run;
		await requests[1].closed;
		assert.deepEqual(events, [["edit", "the answer"], audioFailure]);
		limiter.acquire(requester)();
	},
);

test(
	"the deadline aborts a chat body that stalls after its headers",
	{ timeout: 5000 },
	async (t) => {
		t.mock.timers.enable({ apis: ["setTimeout"] });
		routes["/v1/chat/completions"] = stall("application/json");
		const run = ask.run(interaction());
		await waitFor(() => requests.length === 1);
		t.mock.timers.tick(AI_TIMEOUT_MS);
		await assert.rejects(run);
		await requests[0].closed;
		assert.deepEqual(events, []);
	},
);
