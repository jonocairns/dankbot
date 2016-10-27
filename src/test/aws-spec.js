'use strict';

import test from 'ava';
import sinon from 'sinon';

const storage = require('../lib/storage.js');
const fs = require('fs');

test.cb('Can upload file to aws', t => {
    // fs.readdir('../../sounds', {}, (err, files) => {
    //     let c = 0;
    //     const commands = new Map();
    //     files.forEach((element) => {
    //         storage.upload('../../sounds/' + element, (err, data) => {
    //             c += 1;
    //             console.log('File: ' + c);
    //             if(c === files.length) {
    //                 t.end();
    //             }
    //         });
    //     });
    // });    
    t.end();
});

test.cb('Can get file list from aws', t => {
    storage.listContentsOfBucket((err, data) => {
        let d = data;
        console.log(data.length);
        d.forEach((item) => {
            // console.log(item.Key);
        });
        t.end();
    });
});

test.cb('Can download file list from aws', t => {
    storage.listContentsOfBucket((err, data) => {
        let d = data.slice(data.length - 1);
        console.log(data.length);
        d.forEach((item) => {
            storage.download(item.Key, 'dump/' + item.Key, () => { t.end();  });
        });
    });
});