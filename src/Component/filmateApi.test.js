import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
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
});
