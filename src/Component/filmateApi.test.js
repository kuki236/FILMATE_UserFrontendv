import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkoutOrder,
  downloadTicketPdf,
  getRoomById,
  getMovies,
  getShowtimesByCinema,
  getShowtimesByDate,
  loginUser,
  normalizeCinema,
  normalizeMovie,
  normalizeMovieReview,
  normalizePurchase,
  normalizeRatingDistribution,
  normalizeSeat,
  normalizeSnackCategory,
  normalizeSnackProduct,
  normalizeSocialSummary,
  searchMovies,
  tokenizeCardPayment,
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

  it('normalizes the purchase history contract returned by the backend', () => {
    expect(normalizePurchase({
      id_transaccion: 10,
      fecha: '2026-07-11T17:36:00',
      monto_total: 75,
      pelicula: { id_pelicula: 9, titulo: 'Demo' },
      sede: { nombre_cine: 'Filmate Lima' },
      sala: { nombre_sala: 'Sala 1' },
      fecha_hora_funcion: '2026-07-11T20:30:00',
      asientos: [{ id_asiento: 7, fila: 'A', columna: 1 }],
      productos_confiteria: [{ id_producto: 2, nombre_producto: 'Combo', cantidad: 1, precio_unitario: 45 }],
      tickets: [{ codigo_qr_token: 'qr-demo' }],
      pdf_url: '/client/tickets/transaction/10/pdf',
    })).toMatchObject({
      createdAt: '2026-07-11T17:36:00',
      qrValue: 'qr-demo',
      pdfUrl: '/client/tickets/transaction/10/pdf',
      booking: {
        pelicula: 'Demo',
        horario: '2026-07-11T20:30:00',
        asientos: ['A1'],
        subtotal: 30,
      },
      snacks: [{ nombre: 'Combo', cantidad: 1, precio: 45 }],
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
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/json' }) })
    );
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Content-Type');
  });

  it('can skip per-movie rating requests for fast catalog rendering', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([
      { id_pelicula: 1, titulo: 'Sin rating', duracion_minutos: 90 },
      { id_pelicula: 2, titulo: 'Otra película', duracion_minutos: 100 },
    ]));

    await expect(getMovies({ enrichRatings: false })).resolves.toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('skips blank movie searches and maps populated searches', async () => {
    await expect(searchMovies('   ')).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();

    fetch.mockResolvedValueOnce(jsonResponse({ results: [{ id: 3, titulo: 'Backrooms' }] }));

    await expect(searchMovies('Back')).resolves.toMatchObject([{ id: 3, titulo: 'Backrooms' }]);
    expect(fetch).toHaveBeenCalledWith('/api/client/movies/search?q=Back', expect.any(Object));
  });

  it('enriches movie listings with review averages when the list payload has no rating', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse([{ id_pelicula: 1, titulo: 'Demo', duracion_minutos: 90 }]))
      .mockResolvedValueOnce(jsonResponse([
        { id_resena: 11, puntuacion_estrellas: 5 },
        { id_resena: 12, puntuacion_estrellas: 3 },
      ]));

    await expect(getMovies()).resolves.toMatchObject([{ id: 1, titulo: 'Demo', rating: 4 }]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('logs in and normalizes the returned user', async () => {
    sessionStorage.setItem('filmate_auth_session', JSON.stringify({
      mode: 'registered',
      user: { id_usuario: 4 },
      accessToken: 'expired-token',
    }));
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
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
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

  it('uses the public rooms endpoint', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ id_sala: 3, nombre_sala: 'Sala 3' }));

    await expect(getRoomById(3)).resolves.toMatchObject({ id: 3, nombre: 'Sala 3' });
    expect(fetch).toHaveBeenCalledWith('/api/client/rooms/3', expect.any(Object));
  });

  it('tokenizes a card and sends the exact checkout contract', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ token: 'tok_demo', marca: 'Visa', error: null }))
      .mockResolvedValueOnce(jsonResponse({ id_transaccion: 77, monto_total: 30, boletos: [] }));

    const tokenized = await tokenizeCardPayment({
      numero_tarjeta: '4551700000000004',
      cvv: '123',
      mes_expiracion: 11,
      anio_expiracion: 2030,
      titular: 'USUARIO DEMO',
    });
    await checkoutOrder({
      id_usuario: 4,
      id_funcion: 25,
      ids_asientos: [7],
      snacks: [{ id_producto: 1, cantidad: 1 }],
      monto_confiteria: 26,
      metodo_pago: 'Visa **** 0004',
      token_pago: tokenized.token,
      email: 'demo@filmate.test',
    });

    const checkoutBody = JSON.parse(fetch.mock.calls[1][1].body);
    expect(fetch.mock.calls[1][0]).toBe('/api/client/orders/checkout');
    expect(checkoutBody).toEqual({
      id_usuario: 4,
      id_funcion: 25,
      ids_asientos: [7],
      snacks: [{ id_producto: 1, cantidad: 1 }],
      monto_confiteria: 26,
      metodo_pago: 'Visa **** 0004',
      token_pago: 'tok_demo',
      email: 'demo@filmate.test',
    });
  });

  it('interprets naive showtime datetimes in the Lima timezone', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-07-11T20:45:00Z'));
    fetch.mockResolvedValueOnce(jsonResponse([
      { id_funcion: 1, fecha_hora: '2026-07-11T15:30:00', precio_base: 20 },
      { id_funcion: 2, fecha_hora: '2026-07-11T16:00:00', precio_base: 20 },
    ]));

    await expect(getShowtimesByDate('2026-07-11')).resolves.toMatchObject([
      { id_funcion: 2 },
    ]);
  });

  it('rejects a payment method when the simulated gateway returns no token', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ token: null, error: 'Tarjeta no reconocida' }));

    await expect(tokenizeCardPayment({
      numero_tarjeta: '4111111111111111',
      cvv: '123',
      mes_expiracion: 11,
      anio_expiracion: 2030,
      titular: 'USUARIO DEMO',
    })).rejects.toThrow('Tarjeta no reconocida');
  });

  it('does not retry checkout after a payment rejection', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Fondos insuficientes' }, { status: 402 }));

    await expect(checkoutOrder({
      id_usuario: 4,
      id_funcion: 25,
      ids_asientos: [7],
      token_pago: 'tok_rejected',
      email: 'demo@filmate.test',
    })).rejects.toThrow('Fondos insuficientes');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('downloads the authoritative ticket PDF from the backend', async () => {
    fetch.mockResolvedValueOnce(new Response(new Blob(['pdf-demo'], { type: 'application/pdf' }), {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    }));

    const pdf = await downloadTicketPdf(10);

    expect(pdf).toBeInstanceOf(Blob);
    expect(fetch).toHaveBeenCalledWith(
      '/api/client/tickets/transaction/10/pdf',
      expect.objectContaining({ headers: expect.objectContaining({ Accept: 'application/pdf' }) })
    );
  });

  it('attaches the stored access token to API requests', async () => {
    sessionStorage.setItem('filmate_auth_session', JSON.stringify({
      mode: 'registered',
      user: { id_usuario: 4 },
      accessToken: 'jwt-demo',
    }));
    fetch.mockResolvedValueOnce(jsonResponse([]));

    await getMovies();

    expect(fetch.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer jwt-demo' });
  });
});
