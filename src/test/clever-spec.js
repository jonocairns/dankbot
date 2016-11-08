'use strict';

import test from 'ava';

const cbot = require('cleverbot-node');

test.cb('Can query new cleverbot', (t) => {
	const c = new cbot();
	cbot.prepare(() => {
		c.write('just a dank girl', (response) => {
			t.end();
		});
	});
});
