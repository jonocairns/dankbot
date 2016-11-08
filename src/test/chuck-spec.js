'use strict';

import test from 'ava';

const chuck = require('chuck-norris-api');

test.cb('Can get chuck norris', (t) => {
	chuck.getRandom().then(() => {
		t.end();
	});
});
