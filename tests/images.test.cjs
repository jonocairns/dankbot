const assert = require("node:assert/strict");
const { afterEach, mock, test } = require("node:test");
const {
	downloadDiscordImage,
	decodeGeneratedImage,
	MAX_IMAGE_BYTES,
} = require("../dist/image/download-image");
const { RequestRejectedError } = require("../dist/security");
const { OpenAIImageService } = require("../dist/image/openai-image");
const { GeminiImageService } = require("../dist/image/gemini-image");

const url =
	"https://cdn.discordapp.com/attachments/123/456/image.png?ex=123&hm=signature";
const originalOpenAIKey = process.env.OPENAI_API_KEY;
const originalGoogleKey = process.env.GOOGLE_API_KEY;
afterEach(() => {
	mock.restoreAll();
	for (const [name, original] of [
		["OPENAI_API_KEY", originalOpenAIKey],
		["GOOGLE_API_KEY", originalGoogleKey],
	]) {
		if (original === undefined) delete process.env[name];
		else process.env[name] = original;
	}
});

test("only HTTPS Discord attachment URLs are downloaded", async () => {
	const fetchMock = mock.method(globalThis, "fetch", async () => {
		throw new Error("must not fetch");
	});
	for (const invalid of [
		"http://cdn.discordapp.com/attachments/x",
		"https://127.0.0.1/attachments/x",
		"https://[::1]/attachments/x",
		"https://169.254.169.254/latest/meta-data/",
		"https://cdn.discordapp.com.evil.test/attachments/x",
		"https://cdn.discordapp.com@evil.test/attachments/x",
		"https://user:pass@cdn.discordapp.com/attachments/x",
		"https://cdn.discordapp.com:8443/attachments/x",
		"https://cdn.discordapp.com/avatars/x",
		"file:///etc/passwd",
	])
		await assert.rejects(downloadDiscordImage(invalid), RequestRejectedError);
	assert.equal(fetchMock.mock.callCount(), 0);
});

test("valid downloads disable redirects, set cancellation, and use the response MIME type", async () => {
	let signal;
	mock.method(globalThis, "fetch", async (requested, options) => {
		assert.equal(String(requested), url);
		assert.equal(options.redirect, "error");
		signal = options.signal;
		return new Response(Buffer.from("image"), {
			headers: { "content-type": "image/jpeg; charset=binary" },
		});
	});
	const image = await downloadDiscordImage(url);
	assert.equal(image.buffer.toString(), "image");
	assert.equal(image.mimeType, "image/jpeg");
	assert.equal(signal.aborted, true);
});

test("HTTP errors, nonimages and oversized declared downloads are rejected", async () => {
	for (const response of [
		new Response("error", {
			status: 404,
			headers: { "content-type": "image/png" },
		}),
		new Response("html", { headers: { "content-type": "text/html" } }),
		new Response("image", {
			headers: {
				"content-type": "image/png",
				"content-length": String(MAX_IMAGE_BYTES + 1),
			},
		}),
	]) {
		mock.method(globalThis, "fetch", async () => response);
		await assert.rejects(downloadDiscordImage(url), RequestRejectedError);
		mock.restoreAll();
	}
});

test("streamed bytes are bounded even when content-length lies", async () => {
	let signal;
	mock.method(globalThis, "fetch", async (_requested, options) => {
		signal = options.signal;
		return new Response(
			new ReadableStream({
				start(controller) {
					controller.enqueue(new Uint8Array(MAX_IMAGE_BYTES));
					controller.enqueue(new Uint8Array(1));
					controller.close();
				},
			}),
			{ headers: { "content-type": "image/png", "content-length": "1" } },
		);
	});
	await assert.rejects(downloadDiscordImage(url), RequestRejectedError);
	assert.equal(signal.aborted, true);
});

test("download deadline also aborts a response that stalls after its headers", async (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	let headersReceived;
	const ready = new Promise((resolve) => {
		headersReceived = resolve;
	});
	mock.method(globalThis, "fetch", async (_requested, { signal }) => {
		headersReceived();
		return new Response(
			new ReadableStream({
				start(controller) {
					signal.addEventListener(
						"abort",
						() => controller.error(new Error("aborted")),
						{ once: true },
					);
				},
			}),
			{ headers: { "content-type": "image/png" } },
		);
	});
	const download = downloadDiscordImage(url);
	const rejection = assert.rejects(download, /aborted/);
	await ready;
	t.mock.timers.tick(15000);
	await rejection;
});

test("generated base64 images have the same byte limit", () => {
	assert.deepEqual(
		decodeGeneratedImage(Buffer.from("image").toString("base64")),
		Buffer.from("image"),
	);
	assert.throws(() => decodeGeneratedImage(""), /empty/);
	assert.throws(
		() =>
			decodeGeneratedImage("A".repeat(4 * Math.ceil(MAX_IMAGE_BYTES / 3) + 1)),
		/limit/,
	);
});

test("both providers reject unsafe attachments before generating, without silently dropping them", async () => {
	process.env.OPENAI_API_KEY = "test-key";
	process.env.GOOGLE_API_KEY = "test-key";
	let providerCalls = 0;
	const openai = new OpenAIImageService();
	openai.client = {
		images: {
			edit: async () => {
				providerCalls++;
			},
		},
	};
	const gemini = new GeminiImageService();
	gemini.client = {
		models: {
			generateContent: async () => {
				providerCalls++;
			},
		},
	};
	for (const provider of [openai, gemini]) {
		await assert.rejects(
			provider.generateImage("draw a cat", ["http://127.0.0.1/private"]),
			RequestRejectedError,
		);
	}
	assert.equal(providerCalls, 0);
});

test("DALL-E requests base64 output and does not fetch provider-returned URLs", async () => {
	process.env.OPENAI_API_KEY = "test-key";
	const service = new OpenAIImageService();
	service.model = "dall-e-3";
	let request;
	service.client = {
		images: {
			generate: async (params) => {
				request = params;
				return { data: [{ url: "http://169.254.169.254/secret" }] };
			},
		},
	};
	const fetchMock = mock.method(globalThis, "fetch", async () => {
		throw new Error("must not fetch");
	});
	await assert.rejects(service.generateImage("draw a cat"), /No base64/);
	assert.equal(request.response_format, "b64_json");
	assert.equal(fetchMock.mock.callCount(), 0);
});
