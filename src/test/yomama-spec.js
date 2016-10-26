'use strict';

import test from 'ava';
import sinon from 'sinon';

const request = require('request')

test.cb('Can get yo mama joke', (t) => {
    request('http://api.yomomma.info/', function (msg, response, body) {
      var joke = JSON.parse(body).joke
      t.not(joke, '');
      t.true(joke.length > 0);
      t.end();
    });
});
