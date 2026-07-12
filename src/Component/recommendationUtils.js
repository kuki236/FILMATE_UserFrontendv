const normalizeGenre = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const getGenres = (movie) => {
  if (Array.isArray(movie?.generos) && movie.generos.length > 0) {
    return movie.generos
      .map((genre) => normalizeGenre(typeof genre === 'string' ? genre : genre?.nombre || genre?.nombre_genero))
      .filter(Boolean);
  }

  return String(movie?.genero || '')
    .split(',')
    .map(normalizeGenre)
    .filter(Boolean);
};

const getMovieId = (movie) => String(movie?.id ?? movie?.id_pelicula ?? '');

export function rankMoviesByFavoriteGenres(movies = [], favorites = [], limit = 3) {
  const catalog = Array.isArray(movies) ? movies.filter(Boolean) : [];
  const favoriteCatalog = Array.isArray(favorites) ? favorites.filter(Boolean) : [];
  const catalogById = new Map(catalog.map((movie) => [getMovieId(movie), movie]));
  const favoriteIds = new Set(favoriteCatalog.map(getMovieId).filter(Boolean));
  const genreFrequency = new Map();

  favoriteCatalog.forEach((favorite) => {
    const catalogMovie = catalogById.get(getMovieId(favorite));
    const genres = getGenres(favorite).length > 0 ? getGenres(favorite) : getGenres(catalogMovie);
    new Set(genres).forEach((genre) => {
      genreFrequency.set(genre, (genreFrequency.get(genre) || 0) + 1);
    });
  });

  const preferredGenres = [...genreFrequency.entries()]
    .sort(([firstGenre, firstCount], [secondGenre, secondCount]) => (
      secondCount - firstCount || firstGenre.localeCompare(secondGenre, 'es')
    ))
    .map(([genre]) => genre);

  const nonFavoriteCandidates = catalog.filter((movie) => !favoriteIds.has(getMovieId(movie)));
  const candidates = nonFavoriteCandidates.length > 0 ? nonFavoriteCandidates : catalog;

  const ranked = candidates
    .map((movie) => {
      const genres = getGenres(movie);
      const genreScore = genres.reduce((score, genre) => score + (genreFrequency.get(genre) || 0), 0);
      const matchingGenres = genres.filter((genre) => genreFrequency.has(genre)).length;

      return {
        movie,
        genreScore,
        matchingGenres,
        rating: Number(movie.rating || 0),
        communityFavorites: Number(movie.totalFavoritos || 0),
        views: Number(movie.totalVistas || 0),
        premiere: movie.estreno ? 1 : 0,
      };
    })
    .sort((first, second) => (
      second.genreScore - first.genreScore
      || second.matchingGenres - first.matchingGenres
      || second.rating - first.rating
      || second.communityFavorites - first.communityFavorites
      || second.views - first.views
      || second.premiere - first.premiere
      || String(first.movie.titulo || '').localeCompare(String(second.movie.titulo || ''), 'es')
    ));

  return {
    movies: ranked.slice(0, Math.max(0, limit)).map(({ movie }) => movie),
    preferredGenres,
  };
}
