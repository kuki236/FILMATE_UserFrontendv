import { describe, expect, it } from 'vitest';
import { rankMoviesByFavoriteGenres } from './recommendationUtils.js';

const movies = [
  { id: 1, titulo: 'Favorita', generos: ['Terror', 'Suspenso'], rating: 5 },
  { id: 2, titulo: 'Terror nuevo', generos: ['Terror'], rating: 3 },
  { id: 3, titulo: 'Comedia popular', generos: ['Comedia'], rating: 5, totalFavoritos: 100 },
  { id: 4, titulo: 'Suspenso nuevo', generos: ['Suspenso'], rating: 4 },
];

describe('rankMoviesByFavoriteGenres', () => {
  it('prioritizes genres from favorites and excludes movies already favorited', () => {
    const result = rankMoviesByFavoriteGenres(movies, [movies[0]], 3);

    expect(result.movies.map((movie) => movie.id)).toEqual([4, 2, 3]);
    expect(result.preferredGenres).toEqual(['suspenso', 'terror']);
    expect(result.movies.some((movie) => movie.id === 1)).toBe(false);
  });

  it('falls back to rating and community popularity when there are no favorites', () => {
    const result = rankMoviesByFavoriteGenres(movies.slice(1), [], 2);
    expect(result.movies.map((movie) => movie.id)).toEqual([3, 4]);
  });
});
