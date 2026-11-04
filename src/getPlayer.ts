import {
	AudioPlayer,
	AudioPlayerState,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
	VoiceConnection,
	VoiceConnectionState,
	VoiceConnectionStatus,
} from "@discordjs/voice";
import {
	CacheType,
	ChatInputCommandInteraction,
	GuildMember,
} from "discord.js";
import { Readable } from "stream";
import { logger } from "./logger";

export const UNABLE_TO_CONNECT_ERROR =
	"I cannot play sounds due to reasons above what your simple mind can handle.";

export interface VoiceDependencies {
	joinVoiceChannel: typeof joinVoiceChannel;
	createAudioPlayer: () => AudioPlayer;
	createAudioResource: (input: Readable) => AudioResource;
}

export interface VoiceTimeouts {
	/** How long to wait for the voice connection to become ready. */
	readyMs: number;
	/** How long to wait for a resource to start playing once queued. */
	startMs: number;
	/** How long a Disconnected connection may take to start reconnecting. */
	reconnectMs: number;
	/** How long an idle connection stays in the channel before leaving. */
	idleMs: number;
}

export interface PlayRequest {
	guildId: string;
	channelId: string;
	adapterCreator: Parameters<typeof joinVoiceChannel>[0]["adapterCreator"];
	input: Readable;
	signal?: AbortSignal;
}

const DEFAULT_TIMEOUTS: VoiceTimeouts = {
	readyMs: 15_000,
	startMs: 10_000,
	reconnectMs: 5_000,
	idleMs: 60_000,
};

interface Waiter {
	resolve: () => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

interface Playback {
	input: Readable;
	onInputError: (error: Error) => void;
	resource?: AudioResource;
	waiter?: Waiter;
}

interface GuildSession {
	guildId: string;
	channelId: string;
	connection: VoiceConnection;
	player: AudioPlayer;
	current?: Playback;
	idleTimer?: ReturnType<typeof setTimeout>;
	reconnectTimer?: ReturnType<typeof setTimeout>;
	disposed: boolean;
	onConnectionState: (
		oldState: VoiceConnectionState,
		newState: VoiceConnectionState,
	) => void;
	onPlayerState: (
		oldState: AudioPlayerState,
		newState: AudioPlayerState,
	) => void;
	onError: (error: Error) => void;
}

/** Signals that a newer request replaced this one; not a failure for callers. */
class SupersededError extends Error {
	constructor() {
		super("Superseded by a newer voice request");
		Object.setPrototypeOf(this, new.target.prototype);
		this.name = "SupersededError";
	}
}

/**
 * Owns one voice connection and one audio player per guild. A new request
 * interrupts whatever the guild was playing or waiting on; there is no queue.
 */
export class VoiceManager {
	private readonly sessions = new Map<string, GuildSession>();

	constructor(
		private readonly deps: VoiceDependencies,
		private readonly timeouts: VoiceTimeouts = DEFAULT_TIMEOUTS,
	) {}

	/**
	 * Takes ownership of `request.input`, waits for the connection to be ready
	 * and playback to start, then returns. Resolves early without playing if a
	 * newer request for the same guild supersedes this one.
	 */
	async play(request: PlayRequest): Promise<void> {
		let session: GuildSession;
		try {
			request.signal?.throwIfAborted();
			session = this.getSession(request);
		} catch (error) {
			request.input.destroy();
			throw error;
		}

		const playback: Playback = {
			input: request.input,
			onInputError: (error) => {
				logger.error(error);
				this.finish(session, playback, error);
			},
		};
		this.interrupt(session);
		session.current = playback;
		playback.input.on("error", playback.onInputError);
		const onAbort = () => {
			if (session.current !== playback) return;
			this.finish(session, playback, new Error("Voice playback aborted"));
			if (session.connection.state.status !== VoiceConnectionStatus.Ready) {
				this.dispose(session);
			}
		};
		request.signal?.addEventListener("abort", onAbort, { once: true });

		try {
			request.signal?.throwIfAborted();
			if (session.connection.state.status !== VoiceConnectionStatus.Ready) {
				await this.wait(
					session,
					playback,
					this.timeouts.readyMs,
					"Timed out connecting to the voice channel",
				).catch((error) => {
					if (session.current === playback && !session.disposed) {
						// A connection that never became ready is not worth reusing.
						this.dispose(session);
					}
					throw error;
				});
			}

			// Readiness may have resolved just before replacement or cancellation.
			// Its queued continuation must never play over a newer request.
			request.signal?.throwIfAborted();
			if (session.current !== playback || session.disposed) {
				throw new SupersededError();
			}
			const resource = this.deps.createAudioResource(playback.input);
			playback.resource = resource;
			if (session.current !== playback || session.disposed) {
				throw new SupersededError();
			}
			const started = this.wait(
				session,
				playback,
				this.timeouts.startMs,
				"Timed out starting playback",
			);
			// Awaited below; this only prevents an unhandled rejection if play() throws.
			started.catch(() => undefined);
			session.player.play(resource);
			await started;
		} catch (error) {
			if (session.current === playback) this.finish(session, playback);
			else this.release(playback);
			if (error instanceof SupersededError) {
				logger.info(`voice request in ${session.guildId} was superseded`);
				return;
			}
			throw error;
		} finally {
			// The caller's deadline governs startup; playback owns its own lifetime.
			request.signal?.removeEventListener("abort", onAbort);
		}
	}

	/** Number of guilds with a live voice session. */
	get size() {
		return this.sessions.size;
	}

	private getSession(request: PlayRequest): GuildSession {
		const existing = this.sessions.get(request.guildId);
		if (existing) {
			if (existing.channelId !== request.channelId) {
				existing.channelId = request.channelId;
				if (
					!existing.connection.rejoin({
						channelId: request.channelId,
						selfDeaf: false,
						selfMute: false,
					})
				) {
					this.dispose(existing);
					return this.createSession(request);
				}
			}
			return existing;
		}
		return this.createSession(request);
	}

	private createSession(request: PlayRequest): GuildSession {
		const connection = this.deps.joinVoiceChannel({
			channelId: request.channelId,
			guildId: request.guildId,
			adapterCreator: request.adapterCreator,
			selfDeaf: false,
			selfMute: false,
		});
		const player = this.deps.createAudioPlayer();

		const session: GuildSession = {
			guildId: request.guildId,
			channelId: request.channelId,
			connection,
			player,
			disposed: false,
			onConnectionState: (_oldState, newState) =>
				this.onConnectionState(session, newState),
			onPlayerState: (oldState, newState) =>
				this.onPlayerState(session, oldState, newState),
			onError: (error) => logger.error(error),
		};

		connection.on("stateChange", session.onConnectionState);
		connection.on("error", session.onError);
		player.on("stateChange", session.onPlayerState);
		player.on("error", session.onError);
		connection.subscribe(player);
		this.sessions.set(request.guildId, session);
		return session;
	}

	private onConnectionState(
		session: GuildSession,
		newState: VoiceConnectionState,
	) {
		if (session.disposed) return;
		clearTimeout(session.reconnectTimer);
		session.reconnectTimer = undefined;

		switch (newState.status) {
			case VoiceConnectionStatus.Ready:
				if (session.current && !session.current.resource) {
					this.settle(session.current);
				}
				break;
			case VoiceConnectionStatus.Disconnected:
				// Give Discord a moment to move us (Signalling/Connecting), else leave.
				session.reconnectTimer = setTimeout(
					() => this.dispose(session),
					this.timeouts.reconnectMs,
				);
				break;
			case VoiceConnectionStatus.Destroyed:
				this.dispose(session);
				break;
		}
	}

	private onPlayerState(
		session: GuildSession,
		oldState: AudioPlayerState,
		newState: AudioPlayerState,
	) {
		if (session.disposed) return;
		const playback = session.current;
		if (!playback?.resource) return;
		const ownsOld =
			oldState.status !== AudioPlayerStatus.Idle &&
			oldState.resource === playback.resource;

		if (
			newState.status === AudioPlayerStatus.Playing &&
			newState.resource === playback.resource
		) {
			this.settle(playback);
		} else if (newState.status === AudioPlayerStatus.Idle && ownsOld) {
			// Finished, failed (player emits "error" first) or was stopped.
			this.finish(
				session,
				playback,
				new Error("Playback ended before it started"),
			);
		}
	}

	/** Waits for `settle(playback)`; rejects on timeout or replacement. */
	private wait(
		session: GuildSession,
		playback: Playback,
		timeoutMs: number,
		timeoutMessage: string,
	): Promise<void> {
		if (session.current !== playback || session.disposed) {
			return Promise.reject(new SupersededError());
		}
		return new Promise<void>((resolve, reject) => {
			playback.waiter = {
				resolve,
				reject,
				timer: setTimeout(
					() => this.settle(playback, new Error(timeoutMessage)),
					timeoutMs,
				),
			};
		});
	}

	private settle(playback: Playback, error?: Error) {
		const waiter = playback.waiter;
		if (!waiter) return;
		playback.waiter = undefined;
		clearTimeout(waiter.timer);
		if (error) waiter.reject(error);
		else waiter.resolve();
	}

	/** Stops the guild's current playback so a new request can take over. */
	private interrupt(session: GuildSession) {
		clearTimeout(session.idleTimer);
		session.idleTimer = undefined;
		const previous = session.current;
		if (!previous) return;
		session.current = undefined;
		this.release(previous, new SupersededError());
		if (previous.resource) session.player.stop(true);
	}

	/** Ends the current playback and leaves the channel if nothing follows. */
	private finish(session: GuildSession, playback: Playback, error?: Error) {
		if (session.current !== playback) return;
		session.current = undefined;
		this.release(playback, error);
		if (playback.resource) session.player.stop(true);
		if (session.disposed) return;
		clearTimeout(session.idleTimer);
		session.idleTimer = setTimeout(
			() => this.dispose(session),
			this.timeouts.idleMs,
		);
	}

	private release(playback: Playback, error?: Error) {
		this.settle(playback, error ?? new SupersededError());
		playback.input.off("error", playback.onInputError);
		playback.resource?.playStream.destroy();
		playback.input.destroy();
	}

	private dispose(session: GuildSession) {
		if (session.disposed) return;
		session.disposed = true;
		clearTimeout(session.idleTimer);
		clearTimeout(session.reconnectTimer);
		if (this.sessions.get(session.guildId) === session) {
			this.sessions.delete(session.guildId);
		}

		const playback = session.current;
		session.current = undefined;
		if (playback) this.release(playback, new Error("Voice connection closed"));

		session.connection.off("stateChange", session.onConnectionState);
		session.player.off("stateChange", session.onPlayerState);
		session.player.off("error", session.onError);
		session.player.stop(true);
		if (session.connection.state.status !== VoiceConnectionStatus.Destroyed) {
			session.connection.destroy();
		}
		// Kept until after destroy() so late connection errors are still logged.
		session.connection.off("error", session.onError);
	}
}

const voice = new VoiceManager({
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource: (input) => createAudioResource(input),
});

/**
 * Plays `input` in the caller's voice channel, replacing anything already
 * playing in that guild. Takes ownership of `input` in every outcome.
 */
export const playAudio = async (
	interaction: ChatInputCommandInteraction<CacheType>,
	input: Readable,
	signal?: AbortSignal,
): Promise<void> => {
	const { member, guild, guildId } = interaction;
	const channelId = (member as GuildMember)?.voice?.channel?.id;

	if (!channelId || !guildId || !guild?.voiceAdapterCreator) {
		input.destroy();
		throw new Error(`Unable to join voice channel`);
	}

	await voice.play({
		guildId,
		channelId,
		adapterCreator: guild.voiceAdapterCreator,
		input,
		signal,
	});
};
