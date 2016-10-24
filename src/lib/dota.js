const request = require('request');

class Dota {

	static currentGames(cb) {
		const options = {
			url: 'http://www.trackdota.com/data/games_v2.json',
			encoding: 'utf8',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json; charset=UTF-8',
			},
			json: true,
			gzip: true,
		};
		const limit = 5;
		let count = 0;
		let msg = '';
		request(options, (error, response, body) => {
			if (!error && response.statusCode === 200) {
				if (body.enhanced_matches.length === 0) {
					msg += 'There are live dota games to display.';
				} else {
					msg = `${body.enhanced_matches.length} dota game(s) live!\r\n\r\n`;
					body.enhanced_matches.forEach((item) => {
						msg += `${item.name}\r\n`;
						item.games.forEach((g) => {
							if (count < limit) {
								const radient = g.radiant_team.team_name !== '' ? g.radiant_team.team_name : 'Some fgts';
								const dire = g.dire_team.team_name !== '' ? g.dire_team.team_name : 'some other fgts';
								msg += `**${radient}** (${g.radiant_score}) vs **${dire}** (${g.dire_score})\r\n`;
								if (g.duration) {
									msg += `Game started areound ${Math.ceil(g.duration / 60)} minutes ago`;
								}
								msg += `http://www.trackdota.com/matches/${g.id}\r\n\r\n`;
								count += 1;
							}
						});
					});
				}
				cb(msg);
			}
		});
	}
}

module.exports = Dota;
