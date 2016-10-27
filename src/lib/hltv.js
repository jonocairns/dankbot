const jsdom = require('jsdom');

class Hltv {
	static currentGames(message) {
		jsdom.env('http://www.hltv.org/matches/', ['http://code.jquery.com/jquery.js'], (err, w) => {
			const numberOfGames = w.$('.centerFade .matchTimeCellLive').length;
			let games = '';
			if (numberOfGames > 0) {
				w.$('.centerFade .matchTimeCellLive').each(function as() {
					const parent = w.$(this).parent();
					const team1 = parent.children('.matchTeam1Cell').find('a').text().trim();
					const team2 = parent.children('.matchTeam2Cell').find('a').text().trim();
					const locator = parent.children('.matchActionCell').find('a').attr('href').trim();
					const link = `http://www.hltv.org${locator}`;
					games += (`**${team1}** is playing **${team2}** -> ${link}.\r\n\r\n`);
				});

				message.channel.sendMessage(`:middle_finger: There ${numberOfGames === 1 ? 'is currently one' : `are currently **${numberOfGames}**`} live csgo match${numberOfGames === 1 ? '' : 'es'} :middle_finger:\r\n\r\n${games}`);
			} else {
				message.channel.sendMessage(':middle_finger: There are no live csgo matches atm :middle_finger:');
			}
		});
	}
}

module.exports = Hltv;
