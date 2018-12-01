'use strict';

import test from 'ava';
import sinon from 'sinon';

const Help = require('../lib/help.js');
let msgStub, commands, sentMessages;

var addCommand = (cmd) => {
    const reg = `.${cmd}`;
    commands.set(reg, ['sound', cmd]);
}

test.beforeEach((t) => {

  commands = new Map();
  sentMessages = [];
  msgStub = {
      member: {
          sendMessage: (m) => {
              sentMessages.push(m);
          }
      }
  }
});

test('X chunk test with random cmd lengths', (t) => {
    let rn = Math.floor(Math.random()*10000);
    for(let i = 0; i < rn; i += 1) {
        let cmd = Math.random().toString(36).slice(2);
        addCommand(cmd);
        charLengths += (cmd.length + 2); // the 2 is for the /t at the end of the string for the message.
    }

    Help.displayCommands(msgStub, commands);

    sentMessages.forEach((item) => {
        t.true(item.length < 2000);
    });
});

