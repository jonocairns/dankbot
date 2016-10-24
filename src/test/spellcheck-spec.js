'use strict';

import test from 'ava';
import sinon from 'sinon';

const SpellChecker = require('spellchecker');
const Speller = require('../lib/spellchecker.js');

test('Can check if word is misspelled', (t) => {
    var word = 'fark';

    var isWrong = SpellChecker.isMisspelled(word);

    t.true(isWrong);
});

test('Can offer suggestions for misspelt word', (t) => {
    var word = 'fark';
    
    var possibleCorrections = SpellChecker.getCorrectionsForMisspelling(word);

    t.true(possibleCorrections.length > 0);
});

test('Can use spellchecker will return expected corrections', (t) => {
    var message = Speller.analyze('!spell erbin to spel');

    t.true(message.startsWith('You fucked up'));
});

test('Can use spellchecker will return no corrections', (t) => {
    var message = Speller.analyze('!spell nothing wrong here');

    t.true(message.startsWith('Congratulations'));
});

test('Can deal with random punctuation', (t) => {
    var message = Speller.analyze('This., -/ is #! an $ % ^ & * example ;: {} of a = -_ string with `~)() punctuation');

    t.true(message.startsWith('Congratulations'));
});