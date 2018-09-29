'use strict';

import test from 'ava';
import sinon from 'sinon';

const Giphy = require('../lib/giphy.js');

var store = function(ms, f) {
	return {
		member: {
			sendMessage: (m) => {
				ms.push(m);
			}
		},
		channel: {
			sendMessage: (m) => {
				ms.push(m);
			},
			sendFile: (url) => {
				f.push(url);
			}
		}
	}
}

test('Can get random giphy', async t => {
	let sent = [];
	let fl = [];
	let stb = store(sent, fl);
	stb.content = '!gif';
	
	const bar = await Giphy.giphy(stb)
	
	t.true(fl.length > 0);
});

test('Can get giphy', async t => {
	let sent = [];
	let fl = [];
	let stb = store(sent, fl);
	stb.content = '!gif dank 420';
	
	const bar = await Giphy.giphy(stb)
	
	t.true(fl.length > 0);
});
