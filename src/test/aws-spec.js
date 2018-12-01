'use strict';
require('dotenv').config({path: '../../.env'});

import test from 'ava';

const storage = require('../lib/storage.js');
const fs = require('fs');

test.cb('Can get file list from aws', t => {
    storage.listContentsOfBucket((err, data) => {
        let d = data;
        t.not(data, undefined);
        t.not(data, null);
        t.end();
    });
});

test.cb('Can download file list from aws', t => {
    storage.listContentsOfBucket((err, data) => {
        let d = data.slice(data.length - 1);
        let promises = [];
        d.forEach((item) => {
            promises.push(storage.download(item.Key, 'dump/' + item.Key, () => { t.end();  }));
        });
        Promise.all(promises).then(() => {
            t.end();
        });
    });
});
