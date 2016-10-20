'use strict';

import test from 'ava';
import sinon from 'sinon';

const Database = require('../lib/tts.js');
const Tts = require('../lib/tts.js');
const Logger = require('../lib/logger.js');
let message, commands, sendMessageContent;

var addCommand = (cmd) => {
    const reg = new RegExp(`!${cmd}`, 'i');
    commands.set(reg, ['sound', cmd]);
}

test.beforeEach(() => {
    sinon.stub(console, 'log');
    message = {
        content: '!bot tts "Hi there" !tester',
        channel: {
            sendMessage: (message) => {
                sendMessageContent = message;
            },
        }
    }
    commands = new Map();
});

test.afterEach(() => {
  console.log.restore();
});

test('Can extract tts command correctly', (t) => {
    let ttsObj = Tts.process(message, commands);

    t.is(ttsObj.cmd, 'tester');
    t.is(ttsObj.content, 'Hi there');
});

test('Can extract multiple tts commands correctly', (t) => {
    let ttsObj = Tts.process(message, commands);
    message.content = '!bot tts "Another one" !another';
    let another = Tts.process(message, commands);

    t.is(ttsObj.cmd, 'tester');
    t.is(ttsObj.content, 'Hi there');
    t.false(ttsObj.isEmpty);
    t.is(another.cmd, 'another');
    t.is(another.content, 'Another one');
    t.false(another.isEmpty);
});

test('Should not create tts cmd if it already exists', (t) => {
    let ttsObj = Tts.process(message, commands);
    addCommand(ttsObj.cmd);

    let tryAgain = Tts.process(message, commands);

    t.true(tryAgain.isEmpty);
    t.is(sendMessageContent, 'That command already exists you dickface.');
});

test('Should display error message if malformed string provided', (t) => {
    message.content = '!bot tts anyere !another';

    let ttsObj = Tts.process(message, commands);

    t.true(ttsObj.isEmpty);
    t.is(sendMessageContent, 'Something bad happened. Try again niggah. use (exclamation)bot tts "some text" (exclamation)bind');
});

test('Can extract emojis', (t) => {
    message.content = '!bot tts ":japanese_goblin:" !goblin';

    let ttsObj = Tts.process(message, commands);

    t.is(ttsObj.cmd, 'goblin');
    t.is(ttsObj.content, ':japanese_goblin:');
    t.false(ttsObj.isEmpty);
});

