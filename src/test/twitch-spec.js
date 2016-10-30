'use strict';

import test from 'ava';
import sinon from 'sinon';

const request = require('request')

test.cb('Can get twitch stream status', (t) => {
    if(!process.env.TWITCH) {
        process.env.TWITCH = LocalDevConfig.twitch;
    }

    let suffix = 'notmes'
    var url = 'https://api.twitch.tv/kraken/streams/' + suffix
    request({
      url: url,
      headers: {
        'Accept': 'application/vnd.twitchtv.v3+json',
        'Client-ID': process.env.TWITCH
      }
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var resp
        try {
          resp = JSON.parse(body)

        } catch (e) {
          console.log('The API returned an unconventional response.')
          t.fail();
        }
        if (resp.stream !== null) {
          t.pass();
        } else if (resp.stream === null) {
          t.pass();
        }
        
      } else if (!error && response.statusCode === 404) {
        console.log('Channel does not exist!')
        t.pass();
      }
      t.end();
    });
});
