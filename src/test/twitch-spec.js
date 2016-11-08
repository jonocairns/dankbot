'use strict';

import test from 'ava';
import sinon from 'sinon';

const request = require('request');
const LocalDevConfig = require('../../env.json');

test.cb('Can get twitch stream status', (t) => {
	if (!process.env.TWITCH) {
		process.env.TWITCH = LocalDevConfig.twitch;
	}

	const suffix = 'notmes';
	const url = `https://api.twitch.tv/kraken/streams/${suffix}`;
	request({
		url,
		headers: {
			Accept: 'application/vnd.twitchtv.v3+json',
			'Client-ID': process.env.TWITCH,
		},
	}, (error, response, body) => {
		if (!error && response.statusCode === 200) {
			let resp;
			try {
				resp = JSON.parse(body);
			} catch (e) {
				console.log('The API returned an unconventional response.');
				t.fail();
			}
			if (resp.stream !== null) {
				t.pass();
			} else if (resp.stream === null) {
				t.pass();
			}
		} else if (!error && response.statusCode === 404) {
			console.log('Channel does not exist!');
			t.pass();
		}
		t.end();
	});
});
