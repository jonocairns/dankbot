// Configuration is read from process.env on every call so values loaded by
// dotenv after module import are always honoured.

const DEFAULT_AI_MODEL = "gpt-4o-mini";
const DEFAULT_PIPER_HOST = "192.168.1.75";
const DEFAULT_PIPER_PORT = 10200;

const TTS_PROVIDERS = ["openai", "piper"] as const;
const IMAGE_PROVIDERS = ["openai", "gemini"] as const;

export type TTSProviderName = (typeof TTS_PROVIDERS)[number];
export type ImageProviderName = (typeof IMAGE_PROVIDERS)[number];

export class ConfigError extends Error {
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "ConfigError";
	}
}

const read = (name: string) => process.env[name]?.trim() ?? "";

// Config values here are non-secret, but keep echoed values short and quoted.
const describe = (value: string) =>
	JSON.stringify(value.length > 40 ? `${value.slice(0, 40)}...` : value);

const readChoice = <T extends string>(
	name: string,
	choices: ReadonlyArray<T>,
	fallback: T,
): T => {
	const value = read(name);
	if (!value) return fallback;
	const normalized = value.toLowerCase();
	const match = choices.find((choice) => choice === normalized);
	if (!match) {
		throw new ConfigError(
			`${name} must be one of ${choices.join(", ")} (got ${describe(value)}).`,
		);
	}
	return match;
};

export const getAIModel = (): string =>
	read("OPENAI_MODEL") || DEFAULT_AI_MODEL;

export const getTTSProvider = (): TTSProviderName =>
	readChoice("TTS_PROVIDER", TTS_PROVIDERS, "openai");

export const getImageProvider = (): ImageProviderName =>
	readChoice("IMAGE_PROVIDER", IMAGE_PROVIDERS, "openai");

export const getPiperConnection = (): { host: string; port: number } => {
	const host = read("PIPER_HOST") || DEFAULT_PIPER_HOST;
	const rawPort = read("PIPER_PORT");
	if (!rawPort) return { host, port: DEFAULT_PIPER_PORT };

	const port = /^\d{1,5}$/.test(rawPort) ? Number(rawPort) : Number.NaN;
	if (!(port >= 1 && port <= 65535)) {
		throw new ConfigError(
			`PIPER_PORT must be an integer from 1 to 65535 (got ${describe(rawPort)}).`,
		);
	}
	return { host, port };
};

// Validates provider selection at startup. Credentials stay optional so that
// soundboard-only deployments are unaffected; providers check them lazily.
export const validateStartupConfig = (): void => {
	getAIModel();
	getImageProvider();
	if (getTTSProvider() === "piper") getPiperConnection();
};
