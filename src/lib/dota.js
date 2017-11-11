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
					msg = `:japanese_goblin: **There ${body.enhanced_matches.length === 1 ? 'is' : 'are'} ${body.enhanced_matches.length} dota tournament${body.enhanced_matches.length === 1 ? '' : 's'} with live games** :japanese_goblin: \r\n\r\n`;
					body.enhanced_matches.forEach((item) => {
						msg += `__**${item.name}**__\r\n\r\n`;
						item.games.forEach((g) => {
							if (count < limit) {
								const radient = g.radiant_team.team_name !== '' ? g.radiant_team.team_name : 'Some fgts';
								const dire = g.dire_team.team_name !== '' ? g.dire_team.team_name : 'some other fgts';
								msg += `**${radient}** (${g.radiant_score}) vs **${dire}** (${g.dire_score})\r\n`;
								if (g.duration) {
									msg += `This game started around ${Math.ceil(g.duration / 60)} minutes ago and currently has ${g.spectators} people watching.\r\n`;
								}
								msg += `<http://www.trackdota.com/matches/${g.id}>\r\n\r\n`;
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
