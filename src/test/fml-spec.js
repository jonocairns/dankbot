'use strict';

import test from 'ava';
import sinon from 'sinon';

test.cb('Can get random fml', t => {
    require('random_fml')().then(fml => {
        t.end();
    });
});
