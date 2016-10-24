'use strict';

import test from 'ava';
import sinon from 'sinon';

var request = require('request');

test.cb('Can get csgo feed', (t) => {
    var options = {
        url: 'http://www.trackdota.com/data/games_v2.json',
        encoding: "utf8",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json; charset=UTF-8',
        },
        json: true,
        gzip: true
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            t.pass();
            body.enhanced_matches.forEach((item) => {
                //console.log(item.name);
                item.games.forEach((g) => {
                    const radient = g.radiant_team.team_name !== '' ? g.radiant_team.team_name : 'Some fgts';
                    const dire = g.dire_team.team_name !== '' ? g.dire_team.team_name : 'some other fgts';
                    // console.log(`${radient} (${g.radiant_score}) vs ${dire} (${g.dire_score})`);
                    // console.log(`http://www.trackdota.com/matches/${g.id}`);

                    // console.log(`Game has been going for ${Math.floor(g.duration / 60)} minutes`);
                });
                
            });
        }
        t.end();
    });
    

});
