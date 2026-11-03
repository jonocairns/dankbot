const assert = require("node:assert/strict");
const net = require("node:net");
const { once } = require("node:events");
const { setImmediate: immediate } = require("node:timers/promises");
const { test } = require("node:test");
const { WyomingClient } = require("../dist/tts/wyoming-client");

async function withServer(respond, exercise) {
	const sockets = new Set();
	const server = net.createServer((socket) => {
		sockets.add(socket);
		socket.on("error", () => {
			// Rejected frames intentionally cause the client to destroy its socket.
		});
		socket.on("close", () => sockets.delete(socket));
		socket.once("data", (request) => respond(socket, request));
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	try {
		await exercise(new WyomingClient("127.0.0.1", server.address().port));
	} finally {
		for (const socket of sockets) socket.destroy();
		await new Promise((resolve) => server.close(resolve));
	}
}

test("fragmented Wyoming frames preserve PCM audio and ignore data after audio-stop", async () => {
	await withServer(
		async (socket, request) => {
			assert.equal(JSON.parse(request).data.text, "hello");
			const parts = [
				'{"type":"audio-',
				'chunk","data_length":2,"payload_length":4}\n{}',
				"ab",
				'cd{"type":"audio-stop"}\ninvalid trailing data\n',
			];
			for (const part of parts) {
				socket.write(part);
				await immediate();
			}
		},
		async (client) => {
			assert.equal((await client.synthesize("hello")).toString(), "abcd");
		},
	);
});

test("malformed and oversized frame lengths are rejected without waiting for payloads", async () => {
	for (const response of [
		"null\n",
		"not json\n",
		'{"type":"audio-chunk","payload_length":-1}\n',
		'{"type":"audio-chunk","payload_length":"100"}\n',
		'{"type":"audio-chunk","payload_length":1.5}\n',
		'{"type":"audio-chunk","payload_length":1048577}\n',
		'{"type":"audio-chunk","data_length":65537}\n',
		"x".repeat(16385),
	]) {
		await withServer(
			(socket) => socket.write(response),
			async (client) => {
				await assert.rejects(
					client.synthesize("hello"),
					/Invalid Wyoming|Unexpected|JSON|header is too large/,
				);
			},
		);
	}
});

test("incomplete audio is rejected immediately on disconnect", async () => {
	await withServer(
		(socket) => socket.end('{"type":"audio-chunk","payload_length":4}\nabcd'),
		async (client) => {
			await assert.rejects(client.synthesize("hello"), /before audio-stop/);
		},
	);
});

test("cumulative audio is bounded across individually valid chunks", async () => {
	const frame = Buffer.concat([
		Buffer.from('{"type":"audio-chunk","payload_length":1048576}\n'),
		Buffer.alloc(1024 * 1024),
	]);
	await withServer(
		(socket) => socket.end(Buffer.concat(Array(17).fill(frame))),
		async (client) => {
			await assert.rejects(client.synthesize("hello"), /audio is too large/);
		},
	);
});

test("timeout destroys an open connection", async (t) => {
	let requestReceived;
	const ready = new Promise((resolve) => {
		requestReceived = resolve;
	});
	await withServer(
		() => requestReceived(),
		async (client) => {
			t.mock.timers.enable({ apis: ["setTimeout"] });
			const response = client.synthesize("hello");
			const rejection = assert.rejects(response, /timeout/);
			await ready;
			t.mock.timers.tick(10000);
			await rejection;
		},
	);
});
