import { Socket } from "net";

interface WyomingEvent {
	type: string;
	data_length?: number;
	payload_length?: number;
}

const MAX_HEADER_BYTES = 16 * 1024;
const MAX_DATA_BYTES = 64 * 1024;
const MAX_PAYLOAD_BYTES = 1024 * 1024;
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
const MAX_EVENTS = 4096;

export class WyomingClient {
	constructor(
		private host: string,
		private port: number,
	) {}

	async synthesize(
		text: string,
		voice?: string,
		signal?: AbortSignal,
	): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const socket = new Socket();
			let settled = false;
			let buffer = Buffer.alloc(0);
			let event: WyomingEvent | null = null;
			let receivedBytes = 0;
			let audioBytes = 0;
			let eventCount = 0;
			const audioChunks: Array<Buffer> = [];

			const finish = (error?: Error) => {
				if (settled) return;
				settled = true;
				clearTimeout(timeout);
				signal?.removeEventListener("abort", onAbort);
				socket.destroy();
				if (error) reject(error);
				else resolve(Buffer.concat(audioChunks, audioBytes));
			};
			const timeout = setTimeout(
				() => finish(new Error("Wyoming protocol timeout")),
				10000,
			);
			const onAbort = () => finish(new Error("Wyoming request aborted"));
			if (signal?.aborted) {
				onAbort();
				return;
			}
			signal?.addEventListener("abort", onAbort, { once: true });

			socket.on("error", finish);
			socket.on("close", () =>
				finish(new Error("Connection closed before audio-stop")),
			);
			socket.on("data", (data) => {
				if (settled) return;
				try {
					receivedBytes += data.length;
					if (receivedBytes > MAX_RESPONSE_BYTES)
						throw new Error("Wyoming response is too large");
					buffer = Buffer.concat([buffer, data]);

					while (!settled) {
						if (!event) {
							const newline = buffer.indexOf("\n");
							if (newline === -1) {
								if (buffer.length > MAX_HEADER_BYTES)
									throw new Error("Wyoming header is too large");
								return;
							}
							if (newline > MAX_HEADER_BYTES)
								throw new Error("Wyoming header is too large");
							const parsed: unknown = JSON.parse(
								buffer.subarray(0, newline).toString("utf8"),
							);
							if (++eventCount > MAX_EVENTS)
								throw new Error("Too many Wyoming events");
							buffer = buffer.subarray(newline + 1);
							if (
								!parsed ||
								typeof parsed !== "object" ||
								!("type" in parsed) ||
								typeof parsed.type !== "string"
							) {
								throw new Error("Invalid Wyoming event");
							}
							event = parsed as WyomingEvent;
							for (const [length, maximum] of [
								[event.data_length ?? 0, MAX_DATA_BYTES],
								[event.payload_length ?? 0, MAX_PAYLOAD_BYTES],
							]) {
								if (
									!Number.isSafeInteger(length) ||
									length < 0 ||
									length > maximum
								) {
									throw new Error("Invalid Wyoming frame length");
								}
							}
						}

						const dataLength = event.data_length ?? 0;
						const payloadLength = event.payload_length ?? 0;
						const frameLength = dataLength + payloadLength;
						if (buffer.length < frameLength) return;
						if (event.type === "audio-chunk" && payloadLength > 0) {
							audioBytes += payloadLength;
							if (audioBytes > MAX_AUDIO_BYTES)
								throw new Error("Wyoming audio is too large");
							audioChunks.push(
								Buffer.from(buffer.subarray(dataLength, frameLength)),
							);
						} else if (event.type === "audio-stop") {
							finish();
						} else if (event.type === "error") {
							throw new Error("Wyoming server reported an error");
						}
						buffer = buffer.subarray(frameLength);
						event = null;
					}
				} catch (error) {
					finish(
						error instanceof Error
							? error
							: new Error("Invalid Wyoming response"),
					);
				}
			});

			socket.connect(this.port, this.host, () => {
				socket.write(
					JSON.stringify({
						type: "synthesize",
						data: { text },
						...(voice && { voice }),
					}) + "\n",
				);
			});
		});
	}
}
