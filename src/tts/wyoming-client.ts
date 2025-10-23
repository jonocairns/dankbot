import {Socket} from 'net';
import {logger} from '../logger';

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

export class WyomingClient {
	private host: string;
	private port: number;

	constructor(host: string, port: number) {
		this.host = host;
		this.port = port;
	}

	async synthesize(text: string, voice?: string): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const socket = new Socket();
			const audioChunks: Array<Buffer> = [];
			let buffer = Buffer.alloc(0);

			// State machine
			let state = ParserState.READING_MESSAGE;
			let bytesToRead = 0;
			let currentEvent: WyomingEvent | null = null;
			const resolvedState = {value: false};

			// Timeout to prevent hanging forever
			const timeout = setTimeout(() => {
				if (resolvedState.value) return;
				logger.error('Wyoming protocol timeout - no audio-stop received');
				socket.end();
				if (audioChunks.length > 0) {
					logger.info(`Returning ${audioChunks.length} audio chunks received before timeout`);
					resolvedState.value = true;
					resolve(Buffer.concat(audioChunks));
				} else {
					resolvedState.value = true;
					reject(new Error('Wyoming protocol timeout'));
				}
			}, 30000); // 30 second timeout

			socket.on('error', (err) => {
				if (resolvedState.value) return;
				clearTimeout(timeout);
				logger.error(`Wyoming socket error: ${err.message}`);
				resolvedState.value = true;
				reject(err);
			});

			socket.on('data', (data) => {
				buffer = Buffer.concat([buffer, data]);

				// State machine parser
				let keepProcessing = true;
				while (keepProcessing) {
					switch (state) {
						case ParserState.READING_MESSAGE: {
							// Look for newline to get JSON message
							const newlineIndex = buffer.indexOf('\n');
							if (newlineIndex === -1) {
								keepProcessing = false;
								break;
							}

							const messageLine = buffer.slice(0, newlineIndex).toString('utf-8');
							buffer = buffer.slice(newlineIndex + 1);

							// Skip empty lines
							if (messageLine.trim() === '') {
								break;
							}

							try {
								const event = JSON.parse(messageLine) as WyomingEvent;
								currentEvent = event;

								logger.info(
									`Wyoming: ${event.type} (data: ${event.data_length || 0}, payload: ${
										event.payload_length || 0
									})`
								);

								// Determine next state
								if (event.data_length && event.data_length > 0) {
									state = ParserState.READING_DATA;
									bytesToRead = event.data_length;
								} else if (event.payload_length && event.payload_length > 0) {
									state = ParserState.READING_PAYLOAD;
									bytesToRead = event.payload_length;
								} else {
									// No binary data, handle the event
									this.handleEvent(
										event,
										null,
										audioChunks,
										socket,
										resolve,
										reject,
										resolvedState,
										timeout
									);
									currentEvent = null;
								}
							} catch (err) {
								logger.error(`Failed to parse Wyoming message: ${err}`);
								// Skip and continue
							}
							break;
						}

						case ParserState.READING_DATA: {
							// Read data_length bytes (JSON metadata, we skip this)
							if (buffer.length < bytesToRead) {
								keepProcessing = false;
								break;
							}

							// Skip the data
							buffer = buffer.slice(bytesToRead);
							bytesToRead = 0;

							// Check if there's also a payload to read
							if (currentEvent && currentEvent.payload_length && currentEvent.payload_length > 0) {
								state = ParserState.READING_PAYLOAD;
								bytesToRead = currentEvent.payload_length;
							} else {
								// Done with this event
								if (currentEvent) {
									this.handleEvent(
										currentEvent,
										null,
										audioChunks,
										socket,
										resolve,
										reject,
										resolvedState,
										timeout
									);
									currentEvent = null;
								}
								state = ParserState.READING_MESSAGE;
							}
							break;
						}

						case ParserState.READING_PAYLOAD: {
							// Read payload_length bytes (binary audio data)
							if (buffer.length < bytesToRead) {
								keepProcessing = false;
								break;
							}

							const payloadData = buffer.slice(0, bytesToRead);
							buffer = buffer.slice(bytesToRead);
							bytesToRead = 0;

							// Handle the event with payload
							if (currentEvent) {
								this.handleEvent(
									currentEvent,
									payloadData,
									audioChunks,
									socket,
									resolve,
									reject,
									resolvedState,
									timeout
								);
								currentEvent = null;
							}

							state = ParserState.READING_MESSAGE;
							break;
						}
					}
				}
			});

			socket.on('close', () => {
				if (resolvedState.value) return;
				clearTimeout(timeout);
				logger.info('Wyoming socket closed');
				if (audioChunks.length === 0) {
					resolvedState.value = true;
					reject(new Error('Connection closed without receiving audio'));
				}
			});

			socket.connect(this.port, this.host, () => {
				logger.info(`Connected to Wyoming server at ${this.host}:${this.port}`);

				// Send synthesize request
				const request = {
					type: 'synthesize',
					data: {text},
					...(voice && {voice}),
				};

				const message = JSON.stringify(request) + '\n';
				socket.write(message);
				logger.info('Sent synthesize request to Wyoming server');
			});
		});
	}

	private handleEvent(
		event: WyomingEvent,
		payload: Buffer | null,
		audioChunks: Array<Buffer>,
		socket: Socket,
		resolve: (value: Buffer) => void,
		reject: (reason: Error) => void,
		resolved: {value: boolean},
		timeout: NodeJS.Timeout
	): void {
		switch (event.type) {
			case 'audio-chunk': {
				if (payload) {
					audioChunks.push(payload);
					logger.info(`Collected audio chunk: ${payload.length} bytes`);
				}
				break;
			}

			case 'audio-stop': {
				if (resolved.value) return;
				clearTimeout(timeout);
				socket.end();
				const fullAudio = Buffer.concat(audioChunks);
				logger.info(`Received ${fullAudio.length} bytes of audio from Wyoming`);
				resolved.value = true;
				resolve(fullAudio);
				break;
			}

			case 'error': {
				if (resolved.value) return;
				clearTimeout(timeout);
				socket.end();
				resolved.value = true;
				reject(new Error(`Wyoming error: ${JSON.stringify(event.data)}`));
				break;
			}

			default:
				// Ignore other event types
				logger.info(`Ignoring Wyoming event: ${event.type}`);
				break;
		}
	}
}
