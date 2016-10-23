'use strict';

import test from 'ava';
import sinon from 'sinon';

const giphy = require('giphy-api')(process.env.GIPHY_KEY || 'dc6zaTOxFJmzC');

test('Can get random giphy', async t => {
    const bar = giphy.random({ limit: 1, rating: 'r' })
			.then((results) => {
				if (results && results.data) {
					//console.log(results.data.url);
                    //return results.data.url;
                    t.true(results.data.url.length > 0);
				} else {
                    console.log(error);
				}
			}).catch(console.log);
    await bar;
});

test('Can get giphy', async t => {
    const bar = giphy.random({ s: 'dank 420', limit: 1, rating: 'r' })
			.then((results) => {
				if (results && results.data) {
					//console.log(results.data.url);
                    //return results.data.url;
                    t.true(results.data.url.length > 0);
				} else {
                    console.log(error);
				}
			}).catch(console.log);
    await bar;
});