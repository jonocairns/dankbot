'use strict';

import test from 'ava';
import sinon from 'sinon';

const Help = require('../lib/help.js');
let msgStub,
	commands,
	sentMessages;

const addCommand = (cmd) => {
	const reg = new RegExp(`!${cmd}`, 'i');
	commands.set(reg, ['sound', cmd]);
};

test.beforeEach((t) => {
	commands = new Map();
	sentMessages = [];
	msgStub = {
		member: {
			sendMessage: (m) => {
				sentMessages.push(m);
			},
		},
	};
});

test('Can display chunked commands with one command active', (t) => {
	addCommand('!420');

	Help.displayCommands(msgStub, commands);

	t.is(sentMessages.length, 3);
});

test('Can display chunked commands just under 2000 char limit', (t) => {
	for (let i = 0; i < 332; i += 1) {
		const cmd = '!420';
		addCommand(cmd);
	}

	Help.displayCommands(msgStub, commands);

	t.is(sentMessages.length, 4);
});

test('Can display chunked commands exactly on 2000 char limit', (t) => {
	for (let i = 0; i < 333; i += 1) {
		const cmd = '!420';
		addCommand(cmd);
	}

	Help.displayCommands(msgStub, commands);

	t.is(sentMessages.length, 4);
});

test('Ensure last cmd is kept when chunking over 2000 limit', (t) => {
	for (let i = 0; i < 334; i += 1) {
		const cmd = '!420';
		addCommand(cmd);
	}

	Help.displayCommands(msgStub, commands);

	t.is(sentMessages.length, 4);
});

// TODO Fix when have time
// test('X chunk test', (t) => {
//     let rn = Math.floor(Math.random()*10000);
//     for(let i = 0; i < rn; i += 1) {
//         let cmd = '!420';
//         addCommand(cmd);
//     }

//     Message.displayCommands(msgStub, commands);

//     let expected = Math.ceil((6 * rn) / 2000);
//     t.is(sentMessages.length, expected);
//     sentMessages.forEach((item) => {
//         t.true(item.length < 2000);
//     });
// });

test('X chunk test with random cmd lengths', (t) => {
	const rn = Math.floor(Math.random() * 10000);
	let charLengths = 0;
	for (let i = 0; i < rn; i += 1) {
		const cmd = Math.random().toString(36).slice(2);
		addCommand(cmd);
		charLengths += (cmd.length + 2); // the 2 is for the /t at the end of the string for the message.
	}

	Help.displayCommands(msgStub, commands);

	sentMessages.forEach((item) => {
		t.true(item.length < 2000);
	});
});

