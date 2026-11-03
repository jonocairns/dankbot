export const MAX_PROMPT_LENGTH = 4000;
export const MAX_CONTEXT_LENGTH = 16000;
export const MAX_COMPLETION_TOKENS = 500;
export const AI_TIMEOUT_MS = 120000;

export const ALLOWED_MENTIONS = {
	parse: [] as Array<never>,
	repliedUser: false,
};

export class RequestRejectedError extends Error {
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "RequestRejectedError";
	}
}

export function validatePrompt(prompt: string): void {
	if (!prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) {
		throw new RequestRejectedError(
			`Please use a prompt between 1 and ${MAX_PROMPT_LENGTH} characters.`,
		);
	}
}

interface Requester {
	userId: string;
	guildId: string | null;
}

// Shared across all paid commands and mentions, with no waiting request queue.
export class AIRequestLimiter {
	private requests: Array<{ userId: string; time: number }> = [];
	private activeUsers = new Set<string>();

	constructor(private now: () => number = Date.now) {}

	acquire({ userId, guildId }: Requester): () => void {
		const allowed = (setting: string | undefined, id: string) => {
			const ids = (setting ?? "")
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean);
			return ids.length === 0 || ids.includes(id);
		};
		if (
			!guildId ||
			!allowed(process.env.AI_ALLOWED_GUILD_IDS, guildId) ||
			!allowed(process.env.AI_ALLOWED_USER_IDS, userId)
		) {
			throw new RequestRejectedError(
				"AI requests are not enabled for you in this server.",
			);
		}

		const time = this.now();
		this.requests = this.requests.filter(
			(request) => time - request.time < 60000,
		);
		if (
			this.activeUsers.has(userId) ||
			this.activeUsers.size >= 3 ||
			this.requests.length >= 20 ||
			this.requests.filter((request) => request.userId === userId).length >= 5
		) {
			throw new RequestRejectedError(
				"AI is busy or the request limit was reached. Please try again in a minute.",
			);
		}

		this.requests.push({ userId, time });
		this.activeUsers.add(userId);
		let released = false;
		return () => {
			if (!released) this.activeUsers.delete(userId);
			released = true;
		};
	}
}

export const aiRequestLimiter = new AIRequestLimiter();
