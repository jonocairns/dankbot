'use strict';

import test from 'ava';
import sinon from 'sinon';

const SpellChecker = require('spellchecker');
const Speller = require('../lib/spellchecker.js');

test('Can check if word is misspelled', (t) => {
	const word = 'fark';

	const isWrong = SpellChecker.isMisspelled(word);

	t.true(isWrong);
});

test('Can offer suggestions for misspelt word', (t) => {
	const word = 'fark';

	const possibleCorrections = SpellChecker.getCorrectionsForMisspelling(word);

	t.true(possibleCorrections.length > 0);
});

test('Can use spellchecker will return expected corrections', (t) => {
	const message = Speller.analyze('!spell erbin to spel');

	t.true(message.startsWith(':poop: You fucked up'));
});

test('Can use spellchecker will return no corrections', (t) => {
	const message = Speller.analyze('!spell nothing wrong here');

	t.true(message.startsWith('Congratulations'));
});

test('Can deal with random punctuation', (t) => {
	const message = Speller.analyze('This., -/ is #! an $ % ^ & * example ;: {} of a = -_ string with `~)() punctuation');

	t.true(message.startsWith('Congratulations'));
});
