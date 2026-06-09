const DEFAULT_API_URL = '/api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

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

  return response.json();
}

const asArray = (value) => (Array.isArray(value) ? value : []);

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
      value.nombre_genero,
      value.genero_nombre,
      value.actor_nombre,
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
  const estadoPelicula = movie.estado_pelicula || movie.categoria_cartelera || movie.estado_registro || '';

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

  return {
    id: movie.id_pelicula,
    titulo: movie.titulo,
    genero: movie.genero || generos.join(', ') || 'Cartelera',
    duracion: formatDuration(movie.duracion_minutos),
    clasificacion: movie.clasificacion || movie.clasificacion_edad || 'APT',
    rating: Math.round(movie.promedio_resenas || movie.rating || ((movie.id_pelicula % 5) + 1)),
    imagenPoster: movie.url_poster || '',
    imagenTrailer: movie.url_banner || movie.url_trailer || movie.url_poster || '',
    trailerUrl: movie.url_trailer || '',
    trailer: 'TRÁILER OFICIAL',
    sinopsis: movie.sinopsis || 'Sinopsis próxima a actualizar.',
    director: directorText,
    directores: directorsFromRelations,
    reparto: movie.reparto || actorsFromRelations.join(', ') || 'Por definir',
    estreno: movie.categoria_cartelera === 'Estreno',
    categoriaCartelera: movie.categoria_cartelera,
    estadoRegistro: movie.estado_registro,
    fechaCreacion: movie.fecha_creacion,
    generos,
    actores: reparto,
  };
}

export function normalizeCinema(cinema) {
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

export function normalizeShowtime(showtime) {
  const fechaHora = showtime.fecha_hora_inicio || showtime.fecha_hora || showtime.horario || '';
  const precioBase = Number(showtime.precio_base ?? showtime.precio ?? 0);

  return {
    ...showtime,
    fecha_hora_inicio: fechaHora,
    fecha_hora: fechaHora,
    horario: fechaHora,
    precio_base: Number.isFinite(precioBase) ? precioBase : 0,
  };
}

export function normalizeSeat(seat) {
  const numero = seat.numero ?? seat.columna;

  return {
    ...seat,
    numero,
    columna: seat.columna ?? numero,
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

export async function getMovies() {
  const data = await request('/movies/');
  return Array.isArray(data) ? data.map(normalizeMovie) : [];
}

export async function getMovieById(movieId) {
  const data = await request(`/movies/${movieId}/details`);
  return normalizeMovie(data);
}

export async function getCinemas() {
  const data = await request('/cinemas/');
  return Array.isArray(data) ? data.map(normalizeCinema) : [];
}

export async function getCinemaById(cinemaId) {
  const data = await request(`/cinemas/${cinemaId}`);
  return normalizeCinema(data);
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
  const data = await request(`/showtimes/cinema/${cinemaId}`);
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
  const data = await request(`/showtimes/date/${targetDate}${queryString ? `?${queryString}` : ''}`);
  const funciones = Array.isArray(data) ? data : extractShowtimeList(data);
  return funciones.map(normalizeShowtime);
}

export async function getSeatMap(showtimeId) {
  const data = await request(`/seats/showtime/${showtimeId}`);
  return {
    ...data,
    asientos: asArray(data?.asientos).map(normalizeSeat),
  };
}

export async function lockSeats(showtimeId, seatIds) {
  return request('/seats/lock', {
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

  return request('/orders/checkout', {
    method: 'POST',
    body: JSON.stringify({
      id_usuario: payload.id_usuario,
      id_funcion: payload.id_funcion,
      ids_asientos: idsAsientos,
      snacks,
      monto_confiteria: payload.monto_confiteria || 0,
      metodo_pago: payload.metodo_pago,
    }),
  });
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

export async function getSnackCategories() {
  const data = await request('/snacks/categories');
  return asArray(data).map(normalizeSnackCategory);
}

export async function getSnackProducts() {
  const categories = await getSnackCategories();
  const categoriesById = Object.fromEntries(categories.map((category) => [category.id, category]));
  const data = await request('/snacks/products');

  return {
    categories,
    products: asArray(data).map((product) => normalizeSnackProduct(product, categoriesById)),
  };
}

export { API_BASE_URL };
