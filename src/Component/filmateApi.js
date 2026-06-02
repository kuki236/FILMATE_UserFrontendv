const DEFAULT_API_URL = '/api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

const ERROR_TRANSLATIONS = {
  'Email already registered': 'Ya existe una cuenta con ese correo.',
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

const formatDuration = (minutes) => {
  if (!minutes && minutes !== 0) return 'Por definir';

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours <= 0) return `${minutes} min`;
  return `${hours}h ${rest.toString().padStart(2, '0')}min`;
};

export function normalizeMovie(movie) {
  const genresFromRelations = Array.isArray(movie.generos)
    ? movie.generos
        .map((relation) => relation?.genero?.nombre || relation?.nombre || relation?.genero_nombre || '')
        .filter(Boolean)
    : [];

  const actorsFromRelations = Array.isArray(movie.actores)
    ? movie.actores
        .map((relation) => {
          const actorName = relation?.actor?.nombre || relation?.nombre || relation?.actor_nombre || '';
          const character = relation?.personaje ? `como ${relation.personaje}` : '';
          return [actorName, character].filter(Boolean).join(' ').trim();
        })
        .filter(Boolean)
    : [];

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
    genero: movie.genero || genresFromRelations.join(', ') || 'Cartelera',
    duracion: formatDuration(movie.duracion_minutos),
    clasificacion: movie.clasificacion_edad || 'APT',
    rating: movie.rating ?? ((movie.id_pelicula % 5) + 1),
    imagenPoster: movie.url_poster || '',
    imagenTrailer: movie.url_trailer || movie.url_poster || '',
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
    generos: genresFromRelations,
    actores: actorsFromRelations,
  };
}

export function normalizeCinema(cinema) {
  return {
    id: cinema.id_cine,
    nombre: cinema.nombre,
    direccion: cinema.direccion || 'Dirección por definir',
    ciudad: cinema.ciudad || '',
    horarios: cinema.horarios || 'Lunes a Domingo - 10:00 a.m. a 10:00 p.m.',
    estado: cinema.estado,
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
  const funciones = extractShowtimeList(data);

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
  return Array.isArray(data) ? data : extractShowtimeList(data);
}

export async function getSeatMap(showtimeId) {
  return request(`/seats/showtime/${showtimeId}`);
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
  return request('/orders/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerUser(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export { API_BASE_URL };
