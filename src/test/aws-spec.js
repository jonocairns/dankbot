'use strict';

import test from 'ava';

const storage = require('../lib/storage.js');

test.cb('Can get file list from aws', (t) => {
	storage.listContentsOfBucket((err, data) => {
		const d = data;
		t.not(data, undefined);
		t.not(data, null);
		t.end();
	});
});

test.cb('Can download file list from aws', (t) => {
	storage.listContentsOfBucket((err, data) => {
		const d = data.slice(data.length - 1);
		const promises = [];
		d.forEach((item) => {
			promises.push(storage.download(item.Key, `dump/${item.Key}`, () => { t.end(); }));
		});
		Promise.all(promises).then(() => {
			t.end();
		});
	});
});

