import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getHomeRecommendations,
  getMovies,
  getShowtimesByCinema,
  loginUser,
  normalizeCinema,
  normalizeMovie,
  normalizeMovieReview,
  normalizeRatingDistribution,
  normalizeSeat,
  normalizeSnackCategory,
  normalizeSnackProduct,
  normalizeSocialSummary,
  searchMovies,
} from './filmateApi';

const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('filmateApi normalizers', () => {
  it('normalizes movie data from backend variants', () => {
    const movie = normalizeMovie({
      id_pelicula: 8,
      titulo: 'Pelicula Demo',
      anio_lanzamiento: 2026,
      duracion_minutos: 125,
      clasificacion_edad: '+14',
      promedio_resenas: 4.24,
      categoria_cartelera: 'Estreno',
      generos: [{ genero: { nombre: 'Accion' } }, { nombre_genero: 'Drama' }],
      actores: [{ actor: { nombre: 'Ana' }, personaje: 'Lia' }],
      directores: [{ director: { nombre: 'Directora Uno' } }],
    });

    expect(movie).toMatchObject({
      id: 8,
      titulo: 'Pelicula Demo',
      anio: 2026,
      duracion: '2h 05min',
      clasificacion: '+14',
      rating: 4,
      estreno: true,
      genero: 'Accion, Drama',
      director: 'Directora Uno',
      reparto: 'Ana como Lia',
    });
  });

  it('normalizes cinema, seat, snack and social payloads', () => {
    expect(normalizeCinema({ id_cine: 2, nombre_cine: 'Filmate Lima' })).toMatchObject({
      id: 2,
      nombre: 'Filmate Lima',
    });
    expect(normalizeSeat({ id_asiento: 1, columna: 7, estado_asiento: 'Ocupado' })).toMatchObject({
      numero: 7,
      estado: 'Ocupado',
    });

    const category = normalizeSnackCategory({ id_categoria_confi: 3, nombre_categoria: 'Bebidas' });
    expect(category).toMatchObject({ id: 3, key: 'bebidas', label: 'Bebidas' });
    expect(
      normalizeSnackProduct(
        { id_producto: 11, id_categoria_confi: 3, nombre_producto: 'Agua', precio: '6.50' },
        { 3: category }
      )
    ).toMatchObject({ id: 11, categoryKey: 'bebidas', nombre: 'Agua', precio: 6.5 });

    expect(normalizeSocialSummary({ stats: { seguidores: 3 }, favoritos: [{ id_pelicula: 1, titulo: 'Demo' }] }))
      .toMatchObject({
        stats: { followers: 3 },
        favoriteMovies: [{ id: 1, titulo: 'Demo' }],
      });
  });

  it('normalizes ratings and reviews', () => {
    expect(normalizeRatingDistribution([{ rating: 5, total: 3 }, { calificacion: 2, cantidad: 1 }]))
      .toEqual({ 1: 0, 2: 1, 3: 0, 4: 0, 5: 3 });

    expect(
      normalizeMovieReview(
        { id_resena: 9, puntuacion_estrellas: 5, comentario: 'Muy buena', id_usuario: 7 },
        { id_usuario: 7, username: 'cinefan' }
      )
    ).toMatchObject({
      id: 9,
      usuario: '@cinefan',
      rating: 5,
      texto: 'Muy buena',
    });
  });
});

describe('filmateApi requests', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('gets and normalizes movies from the API', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([{ id_pelicula: 1, titulo: 'Demo', duracion_minutos: 90 }]));

    await expect(getMovies()).resolves.toMatchObject([{ id: 1, titulo: 'Demo', duracion: '1h 30min' }]);
    expect(fetch).toHaveBeenCalledWith(
      '/api/client/movies/?skip=0&limit=50',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    );
  });

  it('skips blank movie searches and maps populated searches', async () => {
    await expect(searchMovies('   ')).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();

    fetch.mockResolvedValueOnce(jsonResponse({ results: [{ id: 3, titulo: 'Backrooms' }] }));

    await expect(searchMovies('Back')).resolves.toMatchObject([{ id: 3, titulo: 'Backrooms' }]);
    expect(fetch).toHaveBeenCalledWith('/api/client/movies/search?q=Back', expect.any(Object));
  });

  it('logs in and normalizes the returned user', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        access_token: 'token',
        user: { id_usuario: 5, nombre_usuario: 'vale', correo_electronico: 'vale@test.local' },
      })
    );

    await expect(loginUser({ correo: 'vale@test.local', contrasena: 'secret' })).resolves.toMatchObject({
      access_token: 'token',
      user: { username: 'vale', correo: 'vale@test.local' },
    });
  });

  it('translates known API errors', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Invalid credentials' }, { status: 401 }));

    await expect(loginUser({ correo: 'bad@test.local', contrasena: 'bad' }))
      .rejects.toThrow('Correo o contrase');
  });

  it('normalizes nested showtime payloads', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ data: { funciones: [{ id_funcion: 1, fecha_hora_inicio: '2026-06-23T18:00:00', precio: '22' }] } })
    );

    await expect(getShowtimesByCinema(1)).resolves.toMatchObject({
      funciones: [{ id_funcion: 1, precio_base: 22 }],
    });
  });

  it('fetches home recommendations with the JWT and normalizes the payload', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        user_id: 42,
        total: 2,
        recomendaciones: [
          { id_pelicula: 101, titulo: 'Dune: Part Two', url_poster: 'https://cdn.filmate.app/dune2.jpg' },
          { id_pelicula: 102, titulo: 'Interestelar', url_poster: 'https://cdn.filmate.app/interestelar.jpg' },
        ],
        signals: { peliculas_favoritas_count: 5 },
      })
    );

    const result = await getHomeRecommendations({ token: 'jwt.demo.token', limit: 10 });

    expect(fetch).toHaveBeenCalledWith(
      '/api/recommendations/home?limit=10',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt.demo.token',
          Accept: 'application/json',
        }),
      })
    );
    expect(result).toMatchObject({
      userId: 42,
      total: 2,
      signals: { peliculas_favoritas_count: 5 },
    });
    expect(result.recomendaciones).toHaveLength(2);
    expect(result.recomendaciones[0]).toMatchObject({ id_pelicula: 101, titulo: 'Dune: Part Two' });
  });

  it('clamps the requested limit to the supported range', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ user_id: 1, total: 0, recomendaciones: [] }));

    await getHomeRecommendations({ token: 'jwt.demo.token', limit: 999 });

    expect(fetch).toHaveBeenCalledWith(
      '/api/recommendations/home?limit=50',
      expect.any(Object)
    );
  });

  it('rejects calls without a token', async () => {
    await expect(getHomeRecommendations({ limit: 5 })).rejects.toThrow('recommendations_unauthorized');
    expect(fetch).not.toHaveBeenCalled();
  });
});
