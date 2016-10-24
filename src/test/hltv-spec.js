'use strict';

import test from 'ava';
import sinon from 'sinon';

var jsdom = require("jsdom");

test.cb('Can get csgo feed', (t) => {
    let end = 0;
    jsdom.env(
        'http://www.hltv.org/matches/',
        ['http://code.jquery.com/jquery.js'],
         (err, w) => { //  div[class^=\"matchListBox\"]
            // console.log("there are currently ", w.$(".centerFade .matchTimeCellLive").length, " live matches!");
            // w.$(".centerFade .matchTimeCellLive").each(function(integer, element) {
            //     console.log(w.$(this).parent().children('.matchTeam1Cell').find('a').text().trim());
            //     console.log('vs');
            //     console.log(w.$(this).parent().children('.matchTeam2Cell').find('a').text().trim());
            //     console.log(w.$(this).parent().children('.matchActionCell').find('a').attr('href').trim());
               
            // });
            t.is(err, null);
            t.end();
            
        }
        );
});