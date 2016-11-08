const SpellChecker = require('spellchecker');

class Spell {

	static analyze(text) {
		let words = text.split(' ').slice(1).join(' ');
		// eslint-disable-next-line
		words = words.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
		words = words.replace(/\s{2,}/g, ' ');
		words = words.split(' ');

		const corrections = [];
		words.forEach((word) => {
			const isWordMisspelled = SpellChecker.isMisspelled(word);

			if (isWordMisspelled) {
				const possibleCorrections = SpellChecker.getCorrectionsForMisspelling(word);
				corrections.push({ word, corrections: possibleCorrections });
			}
		});
		let msg = '';
		if (corrections.length > 0) {
			msg += `:poop: You fucked up ${corrections.length === 1 ? 'a word' : `${corrections.length} words`} you fucking idiot. :thumbsdown: `;
			corrections.forEach((correction, index) => {
				const poss = correction.corrections.join(', ');
				msg += `"${correction.word}" was ${index > 1 ? 'also' : 'just'} fucking wrong. Maybe it was ${poss}?\r\n`;
			});
			msg += '\r\nMaybe read a fucking book or something? :book: ';
		} else {
			msg = 'Congratulations, you aren\'t currently retarded. :unicorn: :thumbsup: :gay_pride_flag: ';
		}

		return msg;
	}
}

module.exports = Spell;
