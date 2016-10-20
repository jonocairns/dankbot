import test from 'ava';
const Logger = require('../lib/logger.js');

test('foo', t => {
    let logger = new Logger();
    logger.trace('balls');
    t.pass();
});

test('bar', async t => {
    const bar = Promise.resolve('bar');

    t.is(await bar, 'bar');
});