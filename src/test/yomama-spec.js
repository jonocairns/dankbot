'use strict';

import test from 'ava';
import sinon from 'sinon';

const request = require('request')

test.cb('Can get yo mama joke', (t) => {
    request('http://api.yomomma.info/', function (msg, response, body) {
      var joke = JSON.parse(body).joke
      console.log(joke);
      t.end();
    });
});
