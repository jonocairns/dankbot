import { Socket } from "net";
import { logger } from "../logger";

interface WyomingEvent {
	type: string;
	data?: Record<string, unknown>;
	data_length?: number;
	payload_length?: number;
}

enum ParserState {
	READING_MESSAGE,
	READING_DATA,
	READING_PAYLOAD,
}

interface ParserContext {
	buffer: Buffer;
	state: ParserState;
	bytesToRead: number;
	currentEvent: WyomingEvent | null;
	audioChunks: Array<Buffer>;
	keepProcessing: boolean;
}

export class WyomingClient {
	constructor(
		private host: string,
		private port: number,
	) {}

	async synthesize(text: string, voice?: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const socket = new Socket();
			let resolved = false;

			const ctx: ParserContext = {
				buffer: Buffer.alloc(0),
				state: ParserState.READING_MESSAGE,
				bytesToRead: 0,
				currentEvent: null,
				audioChunks: [],
				keepProcessing: true,
			};

			const cleanup = (isResolved: boolean) => {
				resolved = isResolved;
				clearTimeout(timeout);
				socket.end();
			};

			const timeout = setTimeout(() => {
				if (resolved) return;
				logger.error("Wyoming timeout");
				cleanup(true);
				reject(new Error("Wyoming protocol timeout"));
			}, 10000);

			socket.on("error", (err) => {
				if (resolved) return;
				cleanup(true);
				reject(err);
			});

			socket.on("data", (data) => {
				ctx.buffer = Buffer.concat([ctx.buffer, data]);
				ctx.keepProcessing = true;

				while (ctx.keepProcessing) {
					if (ctx.state === ParserState.READING_MESSAGE) {
						this.processMessage(ctx, resolve, cleanup);
					} else if (ctx.state === ParserState.READING_DATA) {
						this.processData(ctx, resolve, cleanup);
					} else if (ctx.state === ParserState.READING_PAYLOAD) {
						this.processPayload(ctx, resolve, cleanup);
					}
				}
			});

			socket.on("close", () => {
				if (!resolved && ctx.audioChunks.length === 0) {
					cleanup(true);
					reject(new Error("Connection closed without receiving audio"));
				}
			});

			socket.connect(this.port, this.host, () => {
				const request = {
					type: "synthesize",
					data: { text },
					...(voice && { voice }),
				};
				socket.write(JSON.stringify(request) + "\n");
			});
		});
	}

	private processMessage(
		ctx: ParserContext,
		resolve: (value: Buffer) => void,
		cleanup: (isResolved: boolean) => void,
	): void {
		const newlineIndex = ctx.buffer.indexOf("\n");
		if (newlineIndex === -1) {
			ctx.keepProcessing = false;
			return;
		}

		const messageLine = ctx.buffer.slice(0, newlineIndex).toString("utf-8");
		ctx.buffer = ctx.buffer.slice(newlineIndex + 1);

		if (!messageLine.trim()) return;

		try {
			const event = JSON.parse(messageLine) as WyomingEvent;
			ctx.currentEvent = event;

			if (event.data_length && event.data_length > 0) {
				ctx.state = ParserState.READING_DATA;
				ctx.bytesToRead = event.data_length;
			} else if (event.payload_length && event.payload_length > 0) {
				ctx.state = ParserState.READING_PAYLOAD;
				ctx.bytesToRead = event.payload_length;
			} else {
				this.handleEvent(event, null, ctx.audioChunks, resolve, cleanup);
				ctx.currentEvent = null;
			}
		} catch (_err) {
			// Skip invalid JSON lines
		}
	}

	private processData(
		ctx: ParserContext,
		resolve: (value: Buffer) => void,
		cleanup: (isResolved: boolean) => void,
	): void {
		if (ctx.buffer.length < ctx.bytesToRead) {
			ctx.keepProcessing = false;
			return;
		}

		// Skip metadata
		ctx.buffer = ctx.buffer.slice(ctx.bytesToRead);
		ctx.bytesToRead = 0;

		if (
			ctx.currentEvent?.payload_length &&
			ctx.currentEvent.payload_length > 0
		) {
			ctx.state = ParserState.READING_PAYLOAD;
			ctx.bytesToRead = ctx.currentEvent.payload_length;
		} else {
			if (ctx.currentEvent) {
				this.handleEvent(
					ctx.currentEvent,
					null,
					ctx.audioChunks,
					resolve,
					cleanup,
				);
				ctx.currentEvent = null;
			}
			ctx.state = ParserState.READING_MESSAGE;
		}
	}

	private processPayload(
		ctx: ParserContext,
		resolve: (value: Buffer) => void,
		cleanup: (isResolved: boolean) => void,
	): void {
		if (ctx.buffer.length < ctx.bytesToRead) {
			ctx.keepProcessing = false;
			return;
		}

		const payloadData = ctx.buffer.slice(0, ctx.bytesToRead);
		ctx.buffer = ctx.buffer.slice(ctx.bytesToRead);
		ctx.bytesToRead = 0;

		if (ctx.currentEvent) {
			this.handleEvent(
				ctx.currentEvent,
				payloadData,
				ctx.audioChunks,
				resolve,
				cleanup,
			);
			ctx.currentEvent = null;
		}

		ctx.state = ParserState.READING_MESSAGE;
	}

	private handleEvent(
		event: WyomingEvent,
		payload: Buffer | null,
		audioChunks: Array<Buffer>,
		resolve: (value: Buffer) => void,
		cleanup: (isResolved: boolean) => void,
	): void {
		if (event.type === "audio-chunk" && payload) {
			audioChunks.push(payload);
		} else if (event.type === "audio-stop") {
			cleanup(true);
			resolve(Buffer.concat(audioChunks));
		}
		// Ignore all other events
	}
}
