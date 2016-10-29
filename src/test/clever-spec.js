'use strict';

import test from 'ava';
import sinon from 'sinon';

var cbot = require('cleverbot-node');

test.cb('Can query new cleverbot', (t) => {
    let c = new cbot();
    cbot.prepare(() =>{
      c.write('just a dank girl', (response) => {
           console.log(response.message);
           t.end();
      });
    });
});
