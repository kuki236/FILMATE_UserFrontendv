const DEFAULT_API_URL = '/api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

const getWsBaseUrl = () => {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) return configured.replace(/\/$/, '');

  if (typeof window === 'undefined') return '';

  if (API_BASE_URL === '/api' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'ws://127.0.0.1:8000';
  }

  const apiUrl = API_BASE_URL.startsWith('http')
    ? API_BASE_URL
    : `${window.location.origin}${API_BASE_URL.startsWith('/') ? '' : '/'}${API_BASE_URL}`;
  const url = new URL(apiUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString().replace(/\/$/, '');
};

const ERROR_TRANSLATIONS = {
  'Email already registered': 'Ya existe una cuenta con ese correo.',
  'Username already taken': 'Ya existe una cuenta con ese nombre de usuario.',
  'Invalid credentials': 'Correo o contraseña incorrectos.',
  'User account is not active': 'La cuenta no está activa.',
};

const toReadableMessage = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          return item.msg || item.message || item.detail || item.reason || item.loc?.join('.') || '';
        }
        return '';
      })
      .filter(Boolean);

    return parts.join(' ');
  }

  if (value && typeof value === 'object') {
    return value.detail || value.message || value.msg || value.reason || '';
  }

  return '';
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let message = raw || `Error en la petición (${response.status})`;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      message = toReadableMessage(parsed?.detail) || toReadableMessage(parsed?.message) || toReadableMessage(parsed) || message;
    } catch {
      // Keep the raw response text when the body is not JSON.
    }

    message = ERROR_TRANSLATIONS[message] || message;

    throw new Error(message);
  }

  if (response.status === 204) {
    return {};
  }

  const raw = await response.text().catch(() => '');
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw };
  }
}

async function requestFirstAvailable(paths, options = {}) {
  let lastError = null;

  for (const path of paths) {
    try {
      return await request(path, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No se pudo completar la peticion.');
}

const asArray = (value) => (Array.isArray(value) ? value : []);

const asPayloadArray = (value, keys = []) => {
  if (Array.isArray(value)) return value;

  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }

  return [];
};

const parseConfigValue = (value, type = '') => {
  if (value === undefined || value === null) return value;
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === true || value === 'true' || value === '1';
  if (type === 'json') {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  }

  return value;
};

const normalizeSystemConfig = (data) => {
  const entries = asPayloadArray(data, ['results', 'configuracion', 'config', 'items']);
  const configMap = entries.reduce((acc, item) => {
    const key = item?.clave || item?.key || item?.nombre;
    if (!key) return acc;

    acc[key] = parseConfigValue(item.valor ?? item.value, item.tipo_dato || item.type);
    return acc;
  }, {});

  const source = entries.length ? configMap : data || {};

  return {
    preciosFormato: source.precios_formato || source.preciosFormato || {},
    tiposEntrada: source.tipos_entrada || source.tiposEntrada || [],
    tasaServicio: Number(source.tasa_servicio ?? source.tasaServicio ?? 0),
    ivaPorcentaje: Number(source.iva_porcentaje ?? source.ivaPorcentaje ?? 0),
    limiteAsientosPorTransaccion: Number(source.limite_asientos_por_transaccion ?? source.limiteAsientosPorTransaccion ?? 10),
    tiempoBloqueoAsientosMinutos: Number(source.tiempo_bloqueo_asientos_minutos ?? source.tiempoBloqueoAsientosMinutos ?? 10),
    horasAnticipacionMinimas: Number(source.horas_anticipacion_minimas ?? source.horasAnticipacionMinimas ?? 1),
    diasAnticipacionMaximos: Number(source.dias_anticipacion_maximos ?? source.diasAnticipacionMaximos ?? 7),
  };
};

const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return 'Por definir';

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours <= 0) return `${minutes} min`;
  return `${hours}h ${rest.toString().padStart(2, '0')}min`;
};

const parseTextList = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseTextList(item)).filter(Boolean);
  }

  if (!value) return [];

  if (typeof value === 'object') {
    return [
      value.nombre,
      value.genero?.nombre,
      value.nombre_genero,
      value.genero_nombre,
      value.actor?.nombre,
      value.actor_nombre,
      value.director?.nombre,
      value.director_nombre,
    ]
      .filter(Boolean)
      .map((item) => String(item).trim());
  }

  const text = String(value).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parseTextList(parsed);
    }
  } catch {
    // Plain comma separated text is supported by the current backend.
  }

  return text.split(',').map((item) => item.trim()).filter(Boolean);
};

export function normalizeMovie(movie) {
  if (!movie) return movie;

  const genresFromRelations = asArray(movie.generos)
    .map((relation) => {
      if (typeof relation === 'string') return relation;
      return relation?.genero?.nombre || relation?.nombre || relation?.nombre_genero || relation?.genero_nombre || '';
    })
    .filter(Boolean);

  const actorsFromRelations = asArray(movie.actores)
    .map((relation) => {
      const actorName = relation?.actor?.nombre || relation?.nombre || relation?.actor_nombre || '';
      const character = relation?.personaje ? `como ${relation.personaje}` : '';
      return [actorName, character].filter(Boolean).join(' ').trim();
    })
    .filter(Boolean);

  const generos = parseTextList(movie.generos).length
    ? parseTextList(movie.generos)
    : genresFromRelations;
  const reparto = parseTextList(movie.reparto || movie.elenco).length
    ? parseTextList(movie.reparto || movie.elenco)
    : actorsFromRelations;
  const directorsFromRelations = Array.isArray(movie.directores)
    ? movie.directores
        .map((relation) => relation?.director?.nombre || relation?.nombre || relation?.director_nombre || '')
        .filter(Boolean)
    : [];

  const directorValue =
    typeof movie.director === 'string'
      ? movie.director.trim()
      : movie.director?.nombre || movie.director?.nombre_director || movie.director?.director_nombre || '';

  const directorText =
    directorValue ||
    directorsFromRelations.join(', ') ||
    (typeof movie.directores === 'string' ? movie.directores : '') ||
    'Por definir';
  const ratingValue = movie.promedio_resenas ?? movie.rating;
  const normalizedRating = ratingValue === undefined || ratingValue === null
    ? (((movie.id_pelicula || movie.id || 0) % 5) + 1)
    : Math.round((Number(ratingValue) || 0) * 2) / 2;

  return {
    id: movie.id_pelicula || movie.id,
    titulo: movie.titulo,
    anio: movie.anio_lanzamiento || movie.anio || null,
    genero: movie.genero || generos.join(', ') || 'Cartelera',
    duracion: formatDuration(movie.duracion_minutos),
    clasificacion: movie.clasificacion || movie.clasificacion_edad || 'APT',
    rating: normalizedRating,
    totalResenas: Number(movie.total_resenas || movie.totalResenas || 0),
    totalVistas: Number(movie.total_vistas_comunidad || movie.totalVistas || movie.vistas || 0),
    totalFavoritos: Number(movie.total_favoritos_comunidad || movie.totalFavoritos || movie.favoritos || 0),
    imagenPoster: movie.url_poster || '',
    imagenBanner: movie.url_banner || movie.imagenBanner || '',
    imagenTrailer: movie.url_banner || movie.url_trailer || movie.url_poster || '',
    trailerUrl: movie.url_trailer || '',
    trailer: 'TRÁILER OFICIAL',
    sinopsis: movie.sinopsis || 'Sinopsis próxima a actualizar.',
    director: directorText,
    directores: directorsFromRelations,
    reparto: reparto.join(', ') || 'Por definir',
    estreno: movie.categoria_cartelera === 'Estreno',
    categoriaCartelera: movie.categoria_cartelera,
    estadoRegistro: movie.estado_registro,
    fechaCreacion: movie.fecha_creacion,
    generos,
    actores: reparto,
  };
}

export function normalizeCinema(cinema) {
  if (!cinema) return cinema;

  return {
    id: cinema.id_cine,
    nombre: cinema.nombre_cine || cinema.nombre,
    direccion: cinema.direccion || 'Dirección por definir',
    ciudad: cinema.ciudad || '',
    horarios: cinema.horarios_apertura || cinema.horarios || 'Lunes a Domingo - 10:00 a.m. a 10:00 p.m.',
    mapa: cinema.url_mapa_embebido || '',
    estado: cinema.estado_cine || cinema.estado,
  };
}

export function normalizeRoom(room) {
  if (!room) return room;

  return {
    ...room,
    id: room.id_sala || room.id,
    nombre: room.nombre_sala || room.nombre || 'Sala',
    tipoSala: room.tipo_sala || room.tipoSala || '',
    tipoFormato: room.tipo_formato || room.tipoFormato || '',
  };
}

export function normalizeShowtime(showtime) {
  const fechaHora = showtime.fecha_hora || showtime.fecha_hora_inicio || showtime.horario || '';
  const precioBase = Number(showtime.precio_base ?? showtime.precio ?? 0);
  const cinema = showtime.cine || showtime.cinema || showtime.sede || showtime.room?.cine || showtime.sala?.cine || null;
  const room = showtime.room || showtime.salaDetalle || showtime.sala || null;
  const idCine = showtime.id_cine ?? showtime.idCine ?? cinema?.id_cine ?? cinema?.id;
  const nombreCine = showtime.nombre_cine ?? showtime.nombreCine ?? cinema?.nombre_cine ?? cinema?.nombre;
  const idSala = showtime.id_sala ?? showtime.idSala ?? room?.id_sala ?? room?.id;
  const nombreSala = showtime.nombre_sala ?? showtime.nombreSala ?? room?.nombre_sala ?? room?.nombre;

  return {
    ...showtime,
    id_cine: idCine,
    nombre_cine: nombreCine,
    id_sala: idSala,
    nombre_sala: nombreSala,
    fecha_hora_inicio: fechaHora,
    fecha_hora: fechaHora,
    horario: fechaHora,
    precio_base: Number.isFinite(precioBase) ? precioBase : 0,
  };
}

export function normalizeSeat(seat) {
  if (!seat) return seat;

  const numero = seat.numero ?? seat.columna;
  const estado = seat.estado || seat.estado_asiento || 'Disponible';

  return {
    ...seat,
    numero,
    columna: seat.columna ?? numero,
    estado,
  };
}

export function normalizeUser(user) {
  if (!user) return user;

  const nombre = user.nombre || [user.nombres, user.apellidos].filter(Boolean).join(' ').trim();

  return {
    ...user,
    nombre,
    nombres: user.nombres || nombre,
    username: user.username || user.nombreUsuario || user.nombre_usuario,
    nombreUsuario: user.nombreUsuario || user.username || user.nombre_usuario,
    correo: user.correo || user.correo_electronico,
    estado: user.estado || user.estado_usuario,
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

export function normalizeSnackCategory(category) {
  const label = category.nombre_categoria || category.nombre || 'Productos';
  const normalized = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let key = `categoria-${category.id_categoria_confi || label}`;
  if (normalized.includes('combo')) key = 'combos';
  else if (normalized.includes('canch') || normalized.includes('popcorn')) key = 'popcorn';
  else if (normalized.includes('bebida')) key = 'bebidas';
  else if (normalized.includes('dulce') || normalized.includes('snack')) key = 'dulces';

  return {
    id: category.id_categoria_confi,
    key,
    label,
  };
}

export function normalizeSnackProduct(product, categoriesById = {}) {
  const category = categoriesById[product.id_categoria_confi];

  return {
    id: product.id_producto,
    categoryId: product.id_categoria_confi,
    categoryKey: category?.key || `categoria-${product.id_categoria_confi || 'otros'}`,
    nombre: product.nombre_producto || product.nombre || 'Producto',
    descripcion: product.descripcion || 'Sin descripcion disponible.',
    precio: Number(product.precio || 0),
    imagen: product.url_imagen || '',
    stock: product.stock,
  };
}

export function normalizeSocialSummary(summary) {
  const profile = normalizeUser(summary?.usuario || summary?.profile || summary?.user || null);
  const stats = summary?.stats || {};

  return {
    profile,
    stats: {
      totalMovies: Number(
        stats.total_movies ??
          stats.total_peliculas ??
          stats.peliculas ??
          stats.total_reviews ??
          stats.reviews ??
          0
      ),
      totalReviews: Number(stats.total_reviews ?? stats.reviews ?? 0),
      followers: Number(stats.followers ?? stats.seguidores ?? 0),
      following: Number(stats.following ?? stats.siguiendo ?? 0),
    },
    favoriteMovies: asPayloadArray(
      summary?.top_favorites ||
        summary?.topFavorites ||
        summary?.profile_favorites ||
        summary?.profileFavorites ||
        summary?.peliculas_destacadas ||
        summary?.favoritas_destacadas,
      ['results', 'movies', 'peliculas', 'items']
    ).slice(0, 5).map(normalizeMovie),
  };
}

export function normalizeRatingDistribution(data) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (Array.isArray(data)) {
    data.forEach((item) => {
      const rating = Number(item.rating ?? item.calificacion ?? item.puntuacion_estrellas ?? item.estrellas);
      const total = Number(item.total ?? item.count ?? item.cantidad ?? 0);
      if (rating >= 1 && rating <= 5) distribution[rating] = total;
    });
    return distribution;
  }

  if (data && typeof data === 'object') {
    [1, 2, 3, 4, 5].forEach((rating) => {
      distribution[rating] = Number(data[rating] ?? data[String(rating)] ?? 0);
    });
  }

  return distribution;
}

export function normalizeRatedMovie(item) {
  return {
    id: item?.id_resena || item?.id,
    texto: item?.comentario || item?.texto || '',
    rating: Number(item?.calificacion ?? item?.rating ?? item?.puntuacion_estrellas ?? 0),
    likes: Number(item?.likes ?? item?.total_likes ?? item?.totalLikes ?? item?.me_gusta ?? 0),
    fechaPublicacion:
      item?.fecha_publicacion ||
      item?.fechaPublicacion ||
      item?.created_at ||
      item?.fecha_creacion ||
      null,
    movie: normalizeMovie(item?.pelicula || item?.movie || item),
  };
}

export function normalizeMovieReview(review, user = null) {
  const profile = normalizeUser(review?.usuario || review?.user || user);
  const username =
    profile?.username ||
    review?.username ||
    review?.nombre_usuario ||
    review?.nombreUsuario ||
    '';
  const normalizedUsername = username
    ? `@${String(username).replace(/^@/, '')}`
    : profile?.nombre || review?.nombre || 'Usuario';

  return {
    id: review?.id_resena || review?.id,
    userId: review?.id_usuario || profile?.id_usuario || profile?.id || null,
    usuario: normalizedUsername,
    avatar: profile?.url_perfil || review?.url_perfil || review?.avatar || '',
    rating: Number(
      review?.puntuacion_estrellas ??
        review?.calificacion ??
        review?.rating ??
        review?.estrellas ??
        0
    ),
    texto: review?.comentario || review?.texto || '',
    likes: Number(review?.likes ?? review?.total_likes ?? review?.totalLikes ?? review?.me_gusta ?? 0),
    likedByMe: Boolean(review?.liked_by_me ?? review?.likedByMe ?? review?.me_gusta_usuario),
    fechaPublicacion:
      review?.fecha_publicacion ||
      review?.fechaPublicacion ||
      review?.created_at ||
      review?.fecha_creacion ||
      null,
    movie: normalizeMovie(review?.pelicula || review?.movie || review?.pelicula_resenada || null),
  };
}

export function normalizePurchase(purchase) {
  if (!purchase) return null;

  const transaction = purchase.transaccion || purchase.transaction || purchase;
  const movie =
    purchase.pelicula ||
    purchase.movie ||
    transaction.pelicula ||
    transaction.movie ||
    purchase.funcion?.pelicula ||
    transaction.funcion?.pelicula ||
    null;
  const cinema =
    purchase.cine ||
    purchase.cinema ||
    purchase.sede ||
    transaction.cine ||
    transaction.sede ||
    purchase.funcion?.sala?.cine ||
    transaction.funcion?.sala?.cine ||
    null;
  const room =
    purchase.sala ||
    purchase.room ||
    transaction.sala ||
    transaction.room ||
    purchase.funcion?.sala ||
    transaction.funcion?.sala ||
    null;
  const seats = asPayloadArray(
    purchase.asientos ||
      purchase.detalle_asientos ||
      purchase.detalleBoletaAsientos ||
      purchase.boletos_asientos ||
      transaction.asientos,
    ['results', 'asientos', 'items']
  );
  const snacks = asPayloadArray(
    purchase.snacks ||
      purchase.confiteria ||
      purchase.detalle_confiteria ||
      purchase.detalleBoletaConfiteria ||
      transaction.snacks,
    ['results', 'snacks', 'confiteria', 'items']
  );
  const tickets = asPayloadArray(
    purchase.boletos ||
      purchase.tickets ||
      purchase.boletas ||
      transaction.boletos ||
      transaction.tickets,
    ['results', 'boletos', 'tickets', 'items']
  );
  const qrToken =
    purchase.codigo_qr_token ||
    purchase.qrValue ||
    purchase.qr ||
    tickets.find((ticket) => ticket?.codigo_qr_token || ticket?.qrValue || ticket?.qr)?.codigo_qr_token ||
    tickets.find((ticket) => ticket?.codigo_qr_token || ticket?.qrValue || ticket?.qr)?.qrValue ||
    tickets.find((ticket) => ticket?.codigo_qr_token || ticket?.qrValue || ticket?.qr)?.qr ||
    '';

  const id = transaction.id_transaccion || transaction.id || purchase.id_ticket || purchase.id || qrToken;
  const movieTitle = movie?.titulo || purchase.pelicula_titulo || purchase.titulo_pelicula || purchase.titulo || '';
  const total = Number(
    transaction.monto_total ??
      purchase.monto_total ??
      purchase.total ??
      purchase.total_pago ??
      0
  );

  return {
    id: String(id || Date.now()),
    transactionId: transaction.id_transaccion || transaction.id || null,
    pedidoNumber: purchase.numero_pedido || purchase.pedidoNumber || transaction.id_transaccion || id,
    createdAt:
      transaction.fecha_transaccion ||
      purchase.fecha_transaccion ||
      purchase.fecha_compra ||
      purchase.createdAt ||
      purchase.fecha_emision ||
      new Date().toISOString(),
    method: transaction.metodo_pago || purchase.metodo_pago || purchase.method || 'Pago',
    total,
    type: movieTitle ? 'Reserva y dulceria' : 'Solo dulceria',
    qrValue: qrToken || (id ? `FILMATE|TXN:${id}|TOTAL:${total.toFixed(2)}` : ''),
    booking: movieTitle
      ? {
          pelicula: movieTitle,
          sede: cinema?.nombre_cine || cinema?.nombre || purchase.nombre_cine || purchase.sede || '',
          horario: purchase.funcion?.fecha_hora || transaction.funcion?.fecha_hora || purchase.fecha_hora || '',
          sala: room?.nombre_sala || room?.nombre || purchase.nombre_sala || '',
          asientos: seats
            .map((seat) => seat?.codigo || seat?.nombre || [seat?.fila, seat?.columna].filter(Boolean).join('') || seat?.id_asiento)
            .filter(Boolean),
          seatIds: seats.map((seat) => seat?.id_asiento || seat?.id).filter(Boolean),
          subtotal: Number(transaction.monto_boletos ?? purchase.monto_boletos ?? 0),
        }
      : null,
    snacks: snacks.map((item) => {
      const product = item.producto || item.product || item;
      const cantidad = Number(item.cantidad || 1);
      const precio = Number(item.precio_unitario ?? product.precio ?? item.precio ?? 0);

      return {
        id: product.id_producto || product.id || item.id_producto || item.id,
        nombre: product.nombre_producto || product.nombre || item.nombre_producto || 'Producto',
        cantidad,
        precio,
        subtotal: Number(item.subtotal ?? cantidad * precio),
      };
    }),
  };
}

export async function getMovies({ skip = 0, limit = 50, generoId } = {}) {
  const query = new URLSearchParams();
  query.set('skip', String(skip));
  query.set('limit', String(limit));

  if (generoId !== undefined && generoId !== null && generoId !== '') {
    query.set('genero_id', String(generoId));
  }

  const data = await request(`/client/movies/?${query.toString()}`);
  return Array.isArray(data) ? data.map(normalizeMovie) : [];
}

export async function searchMovies(query) {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) return [];

  const params = new URLSearchParams({ q: normalizedQuery });
  const data = await request(`/client/movies/search?${params.toString()}`);
  return asPayloadArray(data, ['results', 'movies', 'peliculas', 'items']).map(normalizeMovie);
}

export async function getMovieById(movieId) {
  const data = await request(`/client/movies/${movieId}/details`);
  return normalizeMovie(data);
}

export async function createMovieReview(payload) {
  return request('/client/reviews/', {
    method: 'POST',
    body: JSON.stringify({
      id_usuario: payload.id_usuario,
      id_pelicula: payload.id_pelicula,
      puntuacion_estrellas: payload.puntuacion_estrellas,
      comentario: payload.comentario,
    }),
  });
}

export async function getMovieReviews(movieId, userId = null) {
  if (!movieId) return [];

  const query = userId ? `?id_usuario=${encodeURIComponent(userId)}` : '';
  const data = await requestFirstAvailable([
    `/client/reviews/movie/${movieId}${query}`,
    `/client/resenas/movie/${movieId}${query}`,
    `/client/reviews/movie/${movieId}`,
  ]);
  const reviews = asPayloadArray(data, ['results', 'reviews', 'resenas', 'items']);
  const userIds = [
    ...new Set(
      reviews
        .map((review) => review?.id_usuario || review?.usuario?.id_usuario || review?.user?.id_usuario)
        .filter(Boolean)
        .map(String)
    ),
  ];
  const profiles = await Promise.all(
    userIds.map(async (userId) => {
      try {
        return [userId, await getUserProfile(userId)];
      } catch {
        return [userId, null];
      }
    })
  );
  const profilesById = Object.fromEntries(profiles);

  return reviews
    .map((review) => {
      const userId = String(
        review?.id_usuario ||
          review?.usuario?.id_usuario ||
          review?.user?.id_usuario ||
          ''
      );
      return normalizeMovieReview(review, profilesById[userId]);
    })
    .sort((firstReview, secondReview) => {
      const firstDate = Date.parse(firstReview.fechaPublicacion || '') || 0;
      const secondDate = Date.parse(secondReview.fechaPublicacion || '') || 0;
      return secondDate - firstDate;
    });
}

export async function getCinemas() {
  const data = await request('/client/cinemas/');
  return Array.isArray(data) ? data.map(normalizeCinema) : [];
}

export async function getCinemaById(cinemaId) {
  const data = await request(`/client/cinemas/${cinemaId}`);
  return normalizeCinema(data);
}

export async function getRoomById(roomId) {
  if (!roomId) return null;
  const data = await request(`/admin/rooms/${roomId}`);
  return normalizeRoom(data);
}

export async function likeMovieReview(reviewId, userId) {
  if (!reviewId || !userId) return null;

  return requestFirstAvailable([
    `/client/reviews/${reviewId}/like`,
    `/client/resenas/${reviewId}/like`,
  ], {
    method: 'POST',
    body: JSON.stringify({
      id_usuario: userId,
    }),
  });
}

export async function getRooms() {
  const data = await request('/admin/rooms/');
  return asPayloadArray(data, ['results', 'rooms', 'salas', 'items']).map(normalizeRoom);
}

const extractShowtimeList = (data) => {
  const candidates = [
    data,
    data?.funciones,
    data?.data,
    data?.results,
    data?.showtimes,
    data?.items,
    data?.payload,
    data?.data?.funciones,
    data?.data?.data,
    data?.data?.results,
    data?.data?.showtimes,
    data?.data?.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

export async function getShowtimesByCinema(cinemaId) {
  const data = await request(`/client/showtimes/cinema/${cinemaId}`);
  const funciones = extractShowtimeList(data).map(normalizeShowtime);

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return {
      ...data,
      funciones,
    };
  }

  return { funciones };
}

export async function getShowtimesByDate(targetDate, { cinemaId, movieId } = {}) {
  const query = new URLSearchParams();

  if (cinemaId !== undefined && cinemaId !== null && cinemaId !== '') {
    query.set('cinema_id', String(cinemaId));
  }

  if (movieId !== undefined && movieId !== null && movieId !== '') {
    query.set('movie_id', String(movieId));
  }

  const queryString = query.toString();
  const data = await request(`/client/showtimes/date/${targetDate}${queryString ? `?${queryString}` : ''}`);
  const funciones = Array.isArray(data) ? data : extractShowtimeList(data);
  return funciones.map(normalizeShowtime);
}

export async function getSeatMap(showtimeId) {
  const data = await request(`/client/seats/showtime/${showtimeId}`);
  return {
    ...data,
    asientos: asArray(data?.asientos).map(normalizeSeat),
  };
}

export async function lockSeats(showtimeId, seatIds) {
  return request('/client/seats/lock', {
    method: 'POST',
    body: JSON.stringify({
      id_funcion: showtimeId,
      ids_asientos: seatIds,
    }),
  });
}

export async function checkoutOrder(payload) {
  const idsAsientos = payload.ids_asientos || payload.asientos || [];
  const snacks = payload.snacks || payload.confiteria || [];

  return requestFirstAvailable([
    '/client/orders/checkout',
    '/client/compras/checkout',
    '/client/checkout',
    '/client/orders/',
  ], {
    method: 'POST',
    body: JSON.stringify({
      id_usuario: payload.id_usuario,
      id_funcion: payload.id_funcion,
      ids_asientos: idsAsientos,
      snacks,
      monto_confiteria: payload.monto_confiteria || 0,
      monto_boletos: payload.monto_boletos,
      monto_subtotal: payload.monto_subtotal,
      tasa_servicio: payload.tasa_servicio,
      iva_monto: payload.iva_monto,
      metodo_pago: payload.metodo_pago,
    }),
  });
}

export async function getSystemConfig() {
  const data = await requestFirstAvailable([
    '/client/configuracion/sistema',
    '/client/configuracion',
    '/client/system/config',
    '/admin/configuracion-sistema',
    '/admin/configuracion',
  ]);

  return normalizeSystemConfig(data);
}

export async function registerUser(payload) {
  const nombre = payload.nombre || [payload.nombres, payload.apellidos].filter(Boolean).join(' ').trim();

  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      nombre,
      username: payload.username || payload.nombreUsuario || payload.nombre_usuario,
      correo: payload.correo || payload.correo_electronico,
      contrasena: payload.contrasena || payload.password,
      id_tipo_doc: payload.id_tipo_doc || 1,
      numero_documento: payload.numero_documento || payload.numeroDocumento,
      telefono: payload.telefono || null,
      url_perfil: payload.url_perfil || null,
    }),
  }).then(normalizeUser);
}

export async function loginUser(payload) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      correo: payload.correo || payload.correo_electronico,
      contrasena: payload.contrasena || payload.password,
    }),
  });

  return {
    ...data,
    user: normalizeUser(data?.user),
  };
}

export async function getUserProfile(userId) {
  if (!userId) return null;
  const data = await request(`/users/${userId}`);
  return normalizeUser(data);
}

export async function getSocialSummary(userId) {
  if (!userId) {
    return {
      profile: null,
      stats: { totalMovies: 0, totalReviews: 0, followers: 0, following: 0 },
      favoriteMovies: [],
    };
  }

  const data = await requestFirstAvailable([
    `/client/social/summary/${userId}`,
    `/client/actividad/summary/${userId}`,
  ]);

  return normalizeSocialSummary(data);
}

export async function updateSocialProfile(userId, payload) {
  if (!userId) return null;

  const data = await requestFirstAvailable(
    [
      `/client/social/profile/${userId}`,
      `/client/actividad/profile/${userId}`,
    ],
    {
      method: 'PUT',
      body: JSON.stringify({
        bio: payload.bio || payload.descripcion || payload.presentacion || '',
      }),
    }
  );

  return {
    ...data,
    bio: data?.bio ?? payload.bio ?? '',
  };
}

export async function updateUserProfile(userId, payload) {
  if (!userId) return null;

  const data = await request(`/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({
      nombre: payload.nombre,
      username: payload.username || payload.nombreUsuario || payload.nombre_usuario,
      correo: payload.correo || payload.correo_electronico,
      telefono: payload.telefono || null,
      url_perfil: payload.url_perfil || null,
    }),
  });

  return normalizeUser(data);
}

export async function getFavoriteMovies(userId) {
  if (!userId) return [];
  const data = await requestFirstAvailable([
    `/client/users/${userId}/favorite-movies`,
    `/client/movies/favorites/${userId}`,
  ]);
  return asPayloadArray(data, ['results', 'movies', 'peliculas', 'items']).map(normalizeMovie);
}

export async function updateFavoriteMovies(userId, movieIds) {
  if (!userId) return null;

  return requestFirstAvailable(
    [
      `/client/users/${userId}/favorite-movies`,
      `/client/interacciones/usuario/${userId}/favorite-movies`,
    ],
    {
      method: 'PUT',
      body: JSON.stringify({
        movie_ids: asArray(movieIds).slice(0, 5),
      }),
    }
  );
}

export async function searchUsers(query) {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) return [];

  const data = await requestFirstAvailable([
    '/admin/users/?estado=ACTIVO',
    '/admin/users/',
  ]);

  const queryText = normalizedQuery.toLowerCase();

  return asPayloadArray(data, ['results', 'users', 'usuarios', 'items'])
    .map(normalizeUser)
    .filter((user) => String(user.username || '').toLowerCase().includes(queryText))
    .sort((firstUser, secondUser) => {
      const firstUsername = String(firstUser.username || '').toLowerCase();
      const secondUsername = String(secondUser.username || '').toLowerCase();
      const firstStartsWith = firstUsername.startsWith(queryText) ? 0 : 1;
      const secondStartsWith = secondUsername.startsWith(queryText) ? 0 : 1;
      return firstStartsWith - secondStartsWith || firstUsername.localeCompare(secondUsername);
    });
}

export async function getUserRatingDistribution(userId) {
  if (!userId) return normalizeRatingDistribution(null);
  const data = await request(`/client/reviews/user/${userId}/rating-distribution`);
  return normalizeRatingDistribution(data);
}

export async function getUserRatedMovies(userId) {
  if (!userId) return [];
  const data = await request(`/client/reviews/user/${userId}/movies`);
  return asPayloadArray(data, ['results', 'movies', 'peliculas', 'items']).map(normalizeRatedMovie);
}

export async function getUserReviews(userId) {
  if (!userId) return [];

  const data = await requestFirstAvailable([
    `/client/reviews/user/${userId}`,
    `/client/resenas/user/${userId}`,
    `/client/reviews/user/${userId}/list`,
  ]);

  return asPayloadArray(data, ['results', 'reviews', 'resenas', 'items']).map((review) =>
    normalizeMovieReview(review)
  );
}

export async function getUserInteractions(userId) {
  if (!userId) return [];
  const data = await request(`/client/interacciones/usuario/${userId}`);
  return asArray(data);
}

export async function updateMovieInteraction(payload) {
  return request('/client/interacciones/', {
    method: 'POST',
    body: JSON.stringify({
      id_usuario: payload.id_usuario,
      id_pelicula: payload.id_pelicula,
      vista: Boolean(payload.vista),
      favorita: Boolean(payload.favorita),
      en_lista_seguimiento: Boolean(payload.en_lista_seguimiento),
    }),
  });
}

export async function getUserPurchases(userId) {
  if (!userId || userId === 'guest') return [];

  const data = await requestFirstAvailable([
    `/client/orders/user/${userId}`,
    `/client/orders/history/${userId}`,
    `/client/compras/usuario/${userId}`,
    `/client/transacciones/usuario/${userId}`,
    `/client/users/${userId}/purchases`,
  ]);

  return asPayloadArray(data, ['results', 'orders', 'compras', 'transacciones', 'items'])
    .map(normalizePurchase)
    .filter(Boolean)
    .sort((first, second) => {
      const firstDate = Date.parse(first.createdAt || '') || 0;
      const secondDate = Date.parse(second.createdAt || '') || 0;
      return secondDate - firstDate;
    });
}

export async function getMovieInteraction(userId, movieId) {
  if (!userId || !movieId) return null;
  const interactions = await getUserInteractions(userId);
  return interactions.find((item) => String(item.id_pelicula) === String(movieId)) || null;
}

export async function getFollowers(userId) {
  if (!userId) return [];
  const data = await request(`/client/seguidores/${userId}/seguidores`);
  return asArray(data);
}

export async function getFollowing(userId) {
  if (!userId) return [];
  const data = await request(`/client/seguidores/${userId}/siguiendo`);
  return asArray(data);
}

export async function followUser(followerId, followedId) {
  if (!followerId || !followedId) return null;

  return request('/client/seguidores/seguir', {
    method: 'POST',
    body: JSON.stringify({
      id_usuario: followerId,
      id_seguir: followedId,
    }),
  });
}

export async function unfollowUser(followerId, followedId) {
  if (!followerId || !followedId) return null;

  return requestFirstAvailable([
    '/client/seguidores/dejar-de-seguir',
    '/client/seguidores/unfollow',
  ], {
    method: 'POST',
    body: JSON.stringify({
      id_usuario: followerId,
      id_dejar_seguir: followedId,
      id_seguir: followedId,
    }),
  });
}

export async function getSnackCategories() {
  const data = await request('/client/snacks/categories');
  return asArray(data).map(normalizeSnackCategory);
}

export async function getSnackProducts() {
  const categories = await getSnackCategories();
  const categoriesById = Object.fromEntries(categories.map((category) => [category.id, category]));
  const data = await request('/client/snacks/products');

  return {
    categories,
    products: asArray(data).map((product) => normalizeSnackProduct(product, categoriesById)),
  };
}

export function createSeatWebSocket(showtimeId) {
  const wsBaseUrl = getWsBaseUrl();
  if (!wsBaseUrl || !showtimeId) return null;

  return new WebSocket(`${wsBaseUrl}/ws/seats/${showtimeId}`);
}

export { API_BASE_URL };
