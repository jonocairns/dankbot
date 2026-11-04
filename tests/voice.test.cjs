const assert = require("node:assert/strict");
const { EventEmitter, getEventListeners } = require("node:events");
const { PassThrough } = require("node:stream");
const { beforeEach, test } = require("node:test");
const {
	AudioPlayerStatus,
	VoiceConnectionStatus,
} = require("@discordjs/voice");
const { VoiceManager, playAudio } = require("../dist/getPlayer");

beforeEach((t) => t.mock.timers.enable({ apis: ["setTimeout"] }));

class FakeConnection extends EventEmitter {
	constructor(status) {
		super();
		this._state = { status };
		this.subscriptions = [];
		this.rejoins = [];
	}
	get state() {
		return this._state;
	}
	set state(state) {
		const old = this._state;
		this._state = state;
		this.emit("stateChange", old, state);
	}
	setStatus(status) {
		this.state = { status };
	}
	subscribe(player) {
		this.subscriptions.push(player);
	}
	rejoin(config) {
		this.rejoins.push(config);
		return this.state.status !== VoiceConnectionStatus.Destroyed;
	}
	destroy() {
		this.setStatus(VoiceConnectionStatus.Destroyed);
	}
}

class FakePlayer extends EventEmitter {
	constructor() {
		super();
		this._state = { status: AudioPlayerStatus.Idle };
		this.played = [];
	}
	get state() {
		return this._state;
	}
	set state(state) {
		const old = this._state;
		this._state = state;
		this.emit("stateChange", old, state);
	}
	play(resource) {
		this.played.push(resource);
		this.state = { status: AudioPlayerStatus.Buffering, resource };
	}
	startPlaying() {
		this.state = {
			status: AudioPlayerStatus.Playing,
			resource: this.state.resource,
		};
	}
	fail(error) {
		this.emit("error", error);
		this.state = { status: AudioPlayerStatus.Idle };
	}
	stop() {
		if (this.state.status === AudioPlayerStatus.Idle) return false;
		this.state = { status: AudioPlayerStatus.Idle };
		return true;
	}
}

const TIMEOUTS = { readyMs: 50, startMs: 50, reconnectMs: 30, idleMs: 40 };

function harness({ status = VoiceConnectionStatus.Ready, timeouts } = {}) {
	const connections = [];
	const players = [];
	const resources = [];
	const manager = new VoiceManager(
		{
			joinVoiceChannel: () => {
				const connection = new FakeConnection(status);
				connections.push(connection);
				return connection;
			},
			createAudioPlayer: () => {
				const player = new FakePlayer();
				players.push(player);
				return player;
			},
			createAudioResource: (input) => {
				const resource = { playStream: new PassThrough(), input };
				resources.push(resource);
				return resource;
			},
		},
		{ ...TIMEOUTS, ...timeouts },
	);
	const play = (input = new PassThrough(), overrides = {}) =>
		manager.play({
			guildId: "guild",
			channelId: "channel",
			adapterCreator: () => ({}),
			input,
			...overrides,
		});
	return { manager, play, connections, players, resources };
}

const listeners = (emitter) =>
	emitter.eventNames().map((name) => [name, emitter.listenerCount(name)]);
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("repeated requests reuse one connection and player without accumulating listeners", async () => {
	const { play, connections, players, resources } = harness();
	const inputs = [new PassThrough(), new PassThrough(), new PassThrough()];
	let baseline;

	for (const input of inputs) {
		const done = play(input);
		players[0]?.startPlaying();
		await done;
		baseline ??= [listeners(connections[0]), listeners(players[0])];
		assert.deepEqual(
			[listeners(connections[0]), listeners(players[0])],
			baseline,
		);
	}

	assert.equal(connections.length, 1);
	assert.equal(players.length, 1);
	assert.equal(connections[0].subscriptions.length, 1);
	assert.equal(connections[0].listenerCount("stateChange"), 1);
	assert.equal(connections[0].listenerCount("error"), 1);
	assert.equal(players[0].listenerCount("stateChange"), 1);
	assert.equal(players[0].listenerCount("error"), 1);
	// Each replacement destroyed the previous input and transcoded stream.
	assert.deepEqual(
		inputs.map((input) => input.destroyed),
		[true, true, false],
	);
	assert.deepEqual(
		resources.map((resource) => resource.playStream.destroyed),
		[true, true, false],
	);
	assert.equal(players[0].state.resource, resources[2]);
});

test("concurrent requests while connecting only resume the newest", async () => {
	const { play, connections, players, resources } = harness({
		status: VoiceConnectionStatus.Signalling,
	});
	const first = new PassThrough();
	const second = new PassThrough();
	const firstDone = play(first);
	const secondDone = play(second);

	// The superseded request settles without error and owns nothing afterward.
	await firstDone;
	assert.equal(first.destroyed, true);
	assert.equal(resources.length, 0);

	connections[0].setStatus(VoiceConnectionStatus.Ready);
	await tick();
	assert.equal(resources.length, 1);
	assert.equal(resources[0].input, second);
	players[0].startPlaying();
	await secondDone;

	assert.equal(connections.length, 1);
	assert.deepEqual(players[0].played, [resources[0]]);
	assert.equal(second.destroyed, false);
});

test("replacement after readiness resolves cannot resume the previous request", async () => {
	const { play, connections, players, resources } = harness({
		status: VoiceConnectionStatus.Signalling,
	});
	const first = new PassThrough();
	const second = new PassThrough();
	const firstDone = play(first);
	connections[0].setStatus(VoiceConnectionStatus.Ready);
	const secondDone = play(second);
	players[0].startPlaying();
	await Promise.all([firstDone, secondDone]);
	assert.equal(first.destroyed, true);
	assert.equal(resources.length, 1);
	assert.equal(resources[0].input, second);
	assert.deepEqual(players[0].played, [resources[0]]);
	connections[0].destroy();
});

test("an input error while connecting rejects and releases its resources", async () => {
	const { play, connections, resources } = harness({
		status: VoiceConnectionStatus.Signalling,
	});
	const input = new PassThrough();
	const rejected = assert.rejects(play(input), /input unavailable/);
	input.destroy(new Error("input unavailable"));
	await rejected;
	assert.equal(input.destroyed, true);
	assert.equal(input.listenerCount("error"), 0);
	assert.equal(resources.length, 0);
	connections[0].destroy();
});

test("an input error after playback starts stops the player and releases streams", async () => {
	const { play, connections, players, resources } = harness();
	const input = new PassThrough();
	const started = play(input);
	players[0].startPlaying();
	await started;
	input.destroy(new Error("input failed during playback"));
	await tick();
	assert.equal(players[0].state.status, AudioPlayerStatus.Idle);
	assert.equal(resources[0].playStream.destroyed, true);
	assert.equal(input.listenerCount("error"), 0);
	connections[0].destroy();
});

test("cancellation while connecting closes the connection and removes abort listeners", async () => {
	const { play, connections, resources, manager } = harness({
		status: VoiceConnectionStatus.Signalling,
	});
	const controller = new AbortController();
	const input = new PassThrough();
	const rejected = assert.rejects(
		play(input, { signal: controller.signal }),
		/Voice playback aborted/,
	);
	controller.abort();
	await rejected;
	assert.equal(manager.size, 0);
	assert.equal(input.destroyed, true);
	assert.equal(resources.length, 0);
	assert.equal(connections[0].state.status, VoiceConnectionStatus.Destroyed);
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("cancellation while starting playback stops audio, without cancelling later successful playback", async () => {
	const { play, connections, players, resources } = harness();
	const controller = new AbortController();
	const rejected = assert.rejects(
		play(new PassThrough(), { signal: controller.signal }),
		/Voice playback aborted/,
	);
	controller.abort();
	await rejected;
	assert.equal(players[0].state.status, AudioPlayerStatus.Idle);
	assert.equal(resources[0].playStream.destroyed, true);
	assert.equal(getEventListeners(controller.signal, "abort").length, 0);

	const nextController = new AbortController();
	const next = play(new PassThrough(), { signal: nextController.signal });
	players[0].startPlaying();
	await next;
	assert.equal(getEventListeners(nextController.signal, "abort").length, 0);
	nextController.abort();
	assert.equal(players[0].state.status, AudioPlayerStatus.Playing);
	connections[0].destroy();
});

test("an already cancelled request never connects", async () => {
	const { play, connections } = harness();
	const input = new PassThrough();
	await assert.rejects(play(input, { signal: AbortSignal.abort() }), /abort/i);
	assert.equal(input.destroyed, true);
	assert.equal(connections.length, 0);
});

test("readiness timeout rejects, destroys the connection and cleans up", async (t) => {
	const { manager, play, connections, players } = harness({
		status: VoiceConnectionStatus.Connecting,
	});
	const input = new PassThrough();

	const rejected = assert.rejects(play(input), /Timed out connecting/);
	t.mock.timers.tick(TIMEOUTS.readyMs);
	await rejected;
	assert.equal(input.destroyed, true);
	assert.equal(connections[0].state.status, VoiceConnectionStatus.Destroyed);
	assert.equal(connections[0].listenerCount("stateChange"), 0);
	assert.equal(connections[0].listenerCount("error"), 0);
	assert.equal(players[0].listenerCount("stateChange"), 0);
	assert.equal(manager.size, 0);

	// The next request starts a fresh session.
	const next = play();
	assert.equal(connections.length, 2);
	connections[1].setStatus(VoiceConnectionStatus.Ready);
	await tick();
	players[1].startPlaying();
	await next;
});

test("connection destroyed while waiting rejects and a stale session cannot touch the new one", async () => {
	const { manager, play, connections, players } = harness({
		status: VoiceConnectionStatus.Signalling,
	});
	const waiting = play();
	connections[0].destroy();
	await assert.rejects(waiting, /Voice connection closed/);
	assert.equal(manager.size, 0);

	const next = play();
	connections[1].setStatus(VoiceConnectionStatus.Ready);
	await tick();
	players[1].startPlaying();
	await next;

	// Late events from the old objects are ignored by the new session.
	connections[0].emit(
		"stateChange",
		{ status: VoiceConnectionStatus.Ready },
		{ status: VoiceConnectionStatus.Destroyed },
	);
	players[0].emit(
		"stateChange",
		{ status: AudioPlayerStatus.Playing, resource: players[1].state.resource },
		{ status: AudioPlayerStatus.Idle },
	);
	assert.equal(manager.size, 1);
	assert.equal(players[1].state.status, AudioPlayerStatus.Playing);
	assert.equal(connections[1].state.status, VoiceConnectionStatus.Ready);
});

test("playback completion releases streams and disconnects after the idle delay", async (t) => {
	const { manager, play, connections, players, resources } = harness();
	const input = new PassThrough();
	const done = play(input);
	players[0].startPlaying();
	await done;

	players[0].stop();
	assert.equal(input.destroyed, true);
	assert.equal(resources[0].playStream.destroyed, true);
	assert.equal(manager.size, 1);

	t.mock.timers.tick(TIMEOUTS.idleMs);
	assert.equal(connections[0].state.status, VoiceConnectionStatus.Destroyed);
	assert.equal(manager.size, 0);
	assert.equal(players[0].listenerCount("stateChange"), 0);
});

test("a new request cancels the pending idle disconnect", async (t) => {
	const { manager, play, connections, players } = harness();
	const first = play();
	players[0].startPlaying();
	await first;
	players[0].stop();

	const second = play();
	players[0].startPlaying();
	await second;
	t.mock.timers.tick(TIMEOUTS.idleMs);
	assert.equal(connections[0].state.status, VoiceConnectionStatus.Ready);
	assert.equal(manager.size, 1);
	connections[0].destroy();
});

test("playback errors before start reject and clean up; errors after start just finish", async () => {
	const { manager, play, connections, players, resources } = harness();
	const input = new PassThrough();
	const failing = play(input);
	players[0].fail(new Error("ffmpeg died"));
	await assert.rejects(failing, /Playback ended before it started/);
	assert.equal(input.destroyed, true);
	assert.equal(resources[0].playStream.destroyed, true);

	const later = new PassThrough();
	const started = play(later);
	players[0].startPlaying();
	await started;
	players[0].fail(new Error("stream broke"));
	assert.equal(later.destroyed, true);
	assert.equal(manager.size, 1);
	assert.equal(players[0].listenerCount("error"), 1);
	connections[0].destroy();
	assert.equal(manager.size, 0);
});

test("playback that never starts times out and stops the player", async (t) => {
	const { play, connections, players, resources } = harness();
	const rejected = assert.rejects(play(), /Timed out starting playback/);
	t.mock.timers.tick(TIMEOUTS.startMs);
	await rejected;
	assert.equal(players[0].state.status, AudioPlayerStatus.Idle);
	assert.equal(resources[0].playStream.destroyed, true);
	assert.equal(connections[0].state.status, VoiceConnectionStatus.Ready);
	connections[0].destroy();
});

test("disconnects that do not recover within the reconnect window end the session", async (t) => {
	const { manager, play, connections, players } = harness();
	const done = play();
	players[0].startPlaying();
	await done;

	connections[0].setStatus(VoiceConnectionStatus.Disconnected);
	connections[0].setStatus(VoiceConnectionStatus.Signalling);
	t.mock.timers.tick(TIMEOUTS.reconnectMs);
	assert.equal(manager.size, 1);

	connections[0].setStatus(VoiceConnectionStatus.Disconnected);
	t.mock.timers.tick(TIMEOUTS.reconnectMs);
	assert.equal(manager.size, 0);
	assert.equal(connections[0].state.status, VoiceConnectionStatus.Destroyed);
});

test("moving to another channel rejoins the existing connection", async () => {
	const { play, connections, players } = harness();
	const first = play();
	players[0].startPlaying();
	await first;
	const second = play(new PassThrough(), { channelId: "other" });
	players[0].startPlaying();
	await second;
	assert.equal(connections.length, 1);
	assert.deepEqual(connections[0].rejoins, [
		{ channelId: "other", selfDeaf: false, selfMute: false },
	]);
	connections[0].destroy();
});

test("playAudio rejects and destroys the input when the member is not in voice", async () => {
	const input = new PassThrough();
	await assert.rejects(
		playAudio({ member: { voice: {} }, guildId: "guild", guild: {} }, input),
		/Unable to join voice channel/,
	);
	assert.equal(input.destroyed, true);
});
