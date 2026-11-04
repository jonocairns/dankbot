const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { afterEach, mock, test } = require("node:test");

const CONFIG_VARS = [
	"OPENAI_API_KEY",
	"GOOGLE_API_KEY",
	"OPENAI_MODEL",
	"TTS_PROVIDER",
	"IMAGE_PROVIDER",
	"PIPER_HOST",
	"PIPER_PORT",
];
const originalEnv = Object.fromEntries(
	CONFIG_VARS.map((name) => [name, process.env[name]]),
);
function clearConfig() {
	for (const name of CONFIG_VARS) delete process.env[name];
}
clearConfig();
afterEach(() => {
	mock.restoreAll();
	clearConfig();
});
process.on("exit", () => {
	for (const [name, value] of Object.entries(originalEnv))
		if (value !== undefined) process.env[name] = value;
});

// Imported before any .env is loaded, mirroring src/index.ts.
const { ai } = require("../dist/ai");
const config = require("../dist/config");
const { getImageService } = require("../dist/image");
const { OpenAIImageService } = require("../dist/image/openai-image");
const { GeminiImageService } = require("../dist/image/gemini-image");

test("model loaded from .env after import is used for mention requests", async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dankbot-config-"));
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	const envFile = path.join(dir, ".env");
	fs.writeFileSync(
		envFile,
		"OPENAI_API_KEY=dummy-test-key\nOPENAI_MODEL=fixture-model\n",
	);
	assert.equal(config.getAIModel(), "gpt-4o-mini");
	require("dotenv").config({ path: envFile });
	assert.equal(config.getAIModel(), "fixture-model");

	let body;
	mock.method(globalThis, "fetch", async (_url, init) => {
		body = JSON.parse(init.body);
		return new Response(
			JSON.stringify({
				id: "x",
				object: "chat.completion",
				created: 0,
				model: "fixture-model",
				choices: [
					{
						index: 0,
						finish_reason: "stop",
						message: { role: "assistant", content: "ok" },
					},
				],
			}),
			{ headers: { "content-type": "application/json" } },
		);
	});
	const reply = mock.fn(async () => undefined);
	await ai({
		botId: "bot",
		message: {
			content: "<@bot> hello",
			channel: { isThread: () => false },
			reply,
		},
	});
	assert.equal(body.model, "fixture-model");
	assert.deepEqual(reply.mock.calls[0].arguments[0], { content: "ok" });
});

test("unset or blank values keep the existing defaults", () => {
	process.env.OPENAI_MODEL = "  ";
	process.env.TTS_PROVIDER = "";
	assert.equal(config.getAIModel(), "gpt-4o-mini");
	assert.equal(config.getTTSProvider(), "openai");
	assert.equal(config.getImageProvider(), "openai");
	assert.deepEqual(config.getPiperConnection(), {
		host: "192.168.1.75",
		port: 10200,
	});
});

test("supported provider names are normalized", () => {
	process.env.TTS_PROVIDER = " Piper ";
	process.env.IMAGE_PROVIDER = "GEMINI";
	assert.equal(config.getTTSProvider(), "piper");
	assert.equal(config.getImageProvider(), "gemini");
	process.env.TTS_PROVIDER = "openai";
	process.env.IMAGE_PROVIDER = "OpenAI";
	assert.equal(config.getTTSProvider(), "openai");
	assert.equal(config.getImageProvider(), "openai");
});

test("unsupported provider names are rejected instead of falling back to OpenAI", () => {
	for (const value of ["{piper}", "pipr", "open ai"]) {
		process.env.TTS_PROVIDER = value;
		assert.throws(
			() => config.getTTSProvider(),
			(error) =>
				error instanceof config.ConfigError &&
				/TTS_PROVIDER must be one of openai, piper/.test(error.message) &&
				error.message.includes(JSON.stringify(value)),
		);
	}
	for (const value of ["{gemini}", "dalle"]) {
		process.env.IMAGE_PROVIDER = value;
		assert.throws(
			() => config.getImageProvider(),
			/IMAGE_PROVIDER must be one of openai, gemini/,
		);
		assert.throws(() => getImageService(), /IMAGE_PROVIDER/);
	}
});

test("image factory follows the selected provider", () => {
	process.env.OPENAI_API_KEY = "dummy-test-key";
	process.env.GOOGLE_API_KEY = "dummy-test-key";
	assert.ok(getImageService() instanceof OpenAIImageService);
	process.env.IMAGE_PROVIDER = "gemini";
	assert.ok(getImageService() instanceof GeminiImageService);
});

test("Piper port must be a whole number from 1 to 65535", () => {
	process.env.PIPER_HOST = " piper.local ";
	for (const [value, port] of [
		["1", 1],
		[" 10200 ", 10200],
		["65535", 65535],
	]) {
		process.env.PIPER_PORT = value;
		assert.deepEqual(config.getPiperConnection(), {
			host: "piper.local",
			port,
		});
	}
	for (const value of [
		"{10200}",
		"10200abc",
		"0",
		"65536",
		"-1",
		"10.5",
		"1e4",
		"0x10",
		"999999",
	]) {
		process.env.PIPER_PORT = value;
		assert.throws(
			() => config.getPiperConnection(),
			/PIPER_PORT must be an integer from 1 to 65535/,
			value,
		);
	}
});

test("startup validation only checks Piper settings when Piper is selected", () => {
	process.env.PIPER_PORT = "{10200}";
	assert.doesNotThrow(() => config.validateStartupConfig());
	process.env.TTS_PROVIDER = "piper";
	assert.throws(() => config.validateStartupConfig(), /PIPER_PORT/);
	process.env.PIPER_PORT = "10200";
	assert.doesNotThrow(() => config.validateStartupConfig());
	process.env.IMAGE_PROVIDER = "{openai}";
	assert.throws(() => config.validateStartupConfig(), /IMAGE_PROVIDER/);
});

test("invalid provider config stops the entrypoint before Discord login", () => {
	const { Client } = require("discord.js");
	mock.method(require("dotenv"), "config", () => {
		process.env.TTS_PROVIDER = "{piper}";
		return { parsed: {} };
	});
	const login = mock.method(Client.prototype, "login", async () => "test");
	assert.throws(() => require("../dist/index"), /TTS_PROVIDER/);
	assert.equal(login.mock.callCount(), 0);
});
