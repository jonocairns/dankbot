'use strict';

import test from 'ava';
import sinon from 'sinon';

const chuck = require('chuck-norris-api');

test.cb('Can get chuck norris', t => {
    chuck.getRandom().then(f => {
        t.end();
    });
});
