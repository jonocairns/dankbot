'use strict';

import test from 'ava';
import sinon from 'sinon';

const Giphy = require('../lib/giphy.js');

const store = function (ms, f) {
	return {
		member: {
			sendMessage: (m) => {
				ms.push(m);
			},
		},
		channel: {
			sendMessage: (m) => {
				ms.push(m);
			},
			sendFile: (url) => {
				f.push(url);
			},
		},
	};
};

test('Can get random giphy', async (t) => {
	const sent = [];
	const fl = [];
	const stb = store(sent, fl);
	stb.content = '!gif';

	const bar = await Giphy.giphy(stb);

	t.true(fl.length > 0);
});

test('Can get giphy', async (t) => {
	const sent = [];
	const fl = [];
	const stb = store(sent, fl);
	stb.content = '!gif dank 420';

	const bar = await Giphy.giphy(stb);

	t.true(fl.length > 0);
});

test('Try get giphy with unmatchable string sends text message', async (t) => {
	const sent = [];
	const fl = [];
	const stb = store(sent, fl);
	stb.content = '!gif nothingwillmatchthishaha123098';

	const bar = await Giphy.giphy(stb);

	t.true(fl.length === 0);
	t.true(sent.length > 0);
});
