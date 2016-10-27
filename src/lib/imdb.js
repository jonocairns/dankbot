const omdb = require('omdb');

class Imdb {
	static query(message) {
		const query = message.content.split(' ').slice(1).join(' ');
		omdb.search(query, (err, movies) => {
			if (err) {
				console.error(err);
				return;
			}
			if (movies.length < 1) {
				message.channel.sendMessage('No movies were fucking found. Try not searching for something retarded maybe?');
			} else {
				const mv = movies[0];
				omdb.get({ title: mv.title, year: mv.year }, true, (e, movie) => {
					if (e) {
						console.error(e);
						return;
					}

					const imdbRatingStars = parseInt(movie.imdb.rating, 10);
					let stars = '';
					for (let i = 0; i < imdbRatingStars; i += 1) {
						stars += ':star:';
					}

					const imdbString = `**IMDB**: (${movie.imdb.rating}/10)`;
					const nl = '\r\n';
					const actors = movie.actors.join(', ');
					const genres = movie.genres.join(', ');
					const movieMsg = `:movie_camera:${nl}${nl}**${movie.title}** (${movie.year}) ${stars}${nl}${movie.imdb.rating ? imdbString : ''}${nl}**Link**: http://www.imdb.com/title/${movie.imdb.id}/${nl}**Director**: ${movie.director}${nl}**Actors**: ${actors}${nl}**Genres**: ${genres}${nl}${nl}**Plot**: ${movie.plot}`;
					if (movie.poster) {
						message.channel.sendMessage(movieMsg);
						// message.channel.sendFile(movie.poster, 'poster.jpg', movieMsg);
					} else {
						message.channel.sendMessage(movieMsg);
					}
				});
			}
		});
	}
}

module.exports = Imdb;
