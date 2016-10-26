'use strict';

import test from 'ava';
import sinon from 'sinon';

var jsdom = require("jsdom");

test.cb('Can get csgo feed', (t) => {
    let end = 0;
    jsdom.env('http://www.hltv.org/matches/', ['http://code.jquery.com/jquery.js'], (err, w) => { 
        t.is(err, null);
        t.end();   
    });
});