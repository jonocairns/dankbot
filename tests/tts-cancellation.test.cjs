const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const { getEventListeners, once } = require("node:events");
const { mock, test } = require("node:test");

let config;
const id = require.resolve("../dist/config");
require.cache[id] = {
	id,
	filename: id,
	loaded: true,
	exports: {
		getTTSProvider: () => config.provider,
		getPiperConnection: () => config.piper,
	},
};
mock.method(require("../dist/logger").logger, "info", () => undefined);
mock.method(require("../dist/logger").logger, "error", () => undefined);
const {
	getTTSService,
	OpenAITTSService,
	PiperTTSService,
} = require("../dist/tts");
const { WyomingClient } = require("../dist/tts/wyoming-client");

async function listen(server) {
	const sockets = new Set();
	server.on("connection", (socket) => {
		sockets.add(socket);
		socket.on("error", () => undefined);
		socket.on("close", () => sockets.delete(socket));
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	return async () => {
		for (const socket of sockets) socket.destroy();
		await new Promise((resolve) => server.close(resolve));
	};
}

test("provider selection follows config and never falls back to OpenAI", (t) => {
	const originalKey = process.env.OPENAI_API_KEY;
	process.env.OPENAI_API_KEY = "test";
	t.after(() => {
		if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
		else process.env.OPENAI_API_KEY = originalKey;
	});
	config = { provider: "piper", piper: { host: "127.0.0.1", port: 1 } };
	assert.ok(getTTSService() instanceof PiperTTSService);
	config.provider = "openai";
	assert.ok(getTTSService() instanceof OpenAITTSService);
	config.provider = "bogus";
	assert.throws(() => getTTSService(), /Unsupported TTS provider/);
});

test("Piper synthesizes from the configured Wyoming server", async () => {
	const server = net.createServer((socket) =>
		socket.once("data", () =>
			socket.write(
				'{"type":"audio-chunk","payload_length":2}\nab{"type":"audio-stop"}\n',
			),
		),
	);
	const close = await listen(server);
	try {
		config = {
			provider: "piper",
			piper: { host: "127.0.0.1", port: server.address().port },
		};
		const wav = await getTTSService().generateSpeech("hello");
		assert.equal(wav.subarray(0, 4).toString(), "RIFF");
		assert.equal(wav.subarray(44).toString(), "ab");
	} finally {
		await close();
	}
});

test("aborting a Wyoming request closes the socket and removes its listener", async () => {
	let closed;
	const server = net.createServer((socket) => {
		closed = once(socket, "close");
		socket.once("data", () => controller.abort());
	});
	const controller = new AbortController();
	const close = await listen(server);
	try {
		const client = new WyomingClient("127.0.0.1", server.address().port);
		await assert.rejects(
			client.synthesize("hello", undefined, controller.signal),
			/aborted/,
		);
		await closed;
		assert.equal(getEventListeners(controller.signal, "abort").length, 0);
	} finally {
		await close();
	}
});

test("an already aborted Wyoming request never connects", async () => {
	let connections = 0;
	const server = net.createServer(() => connections++);
	const close = await listen(server);
	try {
		const client = new WyomingClient("127.0.0.1", server.address().port);
		await assert.rejects(
			client.synthesize("hello", undefined, AbortSignal.abort()),
			/aborted/,
		);
		await new Promise((resolve) => setTimeout(resolve, 50));
		assert.equal(connections, 0);
	} finally {
		await close();
	}
});

test("completed Wyoming requests remove their abort listener", async () => {
	const server = net.createServer((socket) =>
		socket.once("data", () => socket.write('{"type":"audio-stop"}\n')),
	);
	const close = await listen(server);
	try {
		const controller = new AbortController();
		const client = new WyomingClient("127.0.0.1", server.address().port);
		await client.synthesize("hello", undefined, controller.signal);
		assert.equal(getEventListeners(controller.signal, "abort").length, 0);
	} finally {
		await close();
	}
});

test("aborting OpenAI speech cancels a body that stalls after its headers", async () => {
	let responseClosed;
	const controller = new AbortController();
	const server = http.createServer((req, res) => {
		responseClosed = once(res, "close");
		req.resume();
		req.on("end", () => {
			res.writeHead(200, { "content-type": "audio/mpeg" });
			res.write("partial", () => setTimeout(() => controller.abort(), 20));
		});
	});
	const close = await listen(server);
	const originalBaseURL = process.env.OPENAI_BASE_URL;
	const originalKey = process.env.OPENAI_API_KEY;
	try {
		process.env.OPENAI_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;
		process.env.OPENAI_API_KEY = "test";
		await assert.rejects(
			new OpenAITTSService().generateSpeech(
				"hello",
				undefined,
				controller.signal,
			),
		);
		await responseClosed;
	} finally {
		for (const [name, original] of [
			["OPENAI_BASE_URL", originalBaseURL],
			["OPENAI_API_KEY", originalKey],
		]) {
			if (original === undefined) delete process.env[name];
			else process.env[name] = original;
		}
		await close();
	}
});
