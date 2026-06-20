import http from 'node:http';

const PORT = Number(process.env.MOCK_API_PORT || 8000);

const svgData = (title, subtitle, from, to = '#020617') => {
  const escapedTitle = String(title).replace(/[&<>]/g, '');
  const escapedSubtitle = String(subtitle).replace(/[&<>]/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="800" height="1200" fill="url(#g)"/>
      <circle cx="650" cy="190" r="180" fill="#ffffff" opacity=".08"/>
      <circle cx="120" cy="1000" r="260" fill="#ffffff" opacity=".05"/>
      <path d="M80 90h640v1020H80z" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="5"/>
      <text x="400" y="500" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="62" font-weight="800">${escapedTitle}</text>
      <text x="400" y="580" text-anchor="middle" fill="#f8fafc" opacity=".82" font-family="Arial" font-size="30">${escapedSubtitle}</text>
      <text x="400" y="1040" text-anchor="middle" fill="#ffffff" opacity=".65" font-family="Arial" font-size="24">FILMATE · CARTELERA 2026</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const avatarData = (initials, from = '#2563eb', to = '#0f172a') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
      <rect width="400" height="400" rx="200" fill="url(#g)"/>
      <circle cx="200" cy="150" r="72" fill="#f8fafc" opacity=".92"/>
      <path d="M75 360c20-92 76-128 125-128s105 36 125 128" fill="#f8fafc" opacity=".92"/>
      <text x="200" y="388" text-anchor="middle" fill="#fff" font-family="Arial" font-weight="800" font-size="34">${initials}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const movies = [
  {
    id_pelicula: 1,
    titulo: 'Amos del Universo',
    duracion_minutos: 141,
    clasificacion: '+14',
    promedio_resenas: 5,
    categoria_cartelera: 'Estreno',
    estado_registro: 'ACTIVO',
    url_poster: svgData('AMOS DEL', 'UNIVERSO', '#9f1239', '#172554'),
    url_banner: svgData('AMOS DEL UNIVERSO', 'Una aventura épica', '#7f1d1d', '#020617'),
    url_trailer: 'https://www.youtube.com/embed/K2p_Xz8i2Uo',
    sinopsis: 'El joven príncipe Adam debe recuperar una espada mítica y convertirse en el legendario He-Man para proteger Eternia.',
    generos: ['Acción', 'Fantasía', 'Ciencia ficción'],
    elenco: 'Nicholas Galitzine, Camila Mendes, Idris Elba',
    director: 'Travis Knight',
  },
  {
    id_pelicula: 2,
    titulo: 'Paucartambo',
    duracion_minutos: 71,
    clasificacion: 'APT',
    promedio_resenas: 4,
    categoria_cartelera: 'Estreno',
    estado_registro: 'ACTIVO',
    url_poster: svgData('PAUCARTAMBO', 'Tradición viva', '#b45309', '#451a03'),
    url_banner: svgData('PAUCARTAMBO', 'Fiesta de la Virgen del Carmen', '#c2410c', '#1c1917'),
    url_trailer: '',
    sinopsis: 'Documental observacional que retrata la profundidad de la cosmovisión andina y el sincretismo peruano.',
    generos: ['Documental'],
    elenco: 'Fabricio Quillahuaman, Augusto Casafranca',
    director: 'William Bustos',
  },
  {
    id_pelicula: 3,
    titulo: 'Scary Movie',
    duracion_minutos: 96,
    clasificacion: '+18',
    promedio_resenas: 4,
    categoria_cartelera: 'Cartelera',
    estado_registro: 'ACTIVO',
    url_poster: svgData('SCARY', 'MOVIE', '#6d28d9', '#111827'),
    url_banner: svgData('SCARY MOVIE', 'Terroríficamente incorrecta', '#581c87', '#020617'),
    url_trailer: '',
    sinopsis: 'Una comedia de terror en la que ninguna película del género está a salvo.',
    generos: ['Comedia', 'Terror'],
    elenco: 'Anna Faris, Regina Hall, Marlon Wayans',
    director: 'Michael Tiddes',
  },
  {
    id_pelicula: 4,
    titulo: 'Amando a Amanda',
    duracion_minutos: 90,
    clasificacion: '+14',
    promedio_resenas: 4,
    categoria_cartelera: 'Cartelera',
    estado_registro: 'ACTIVO',
    url_poster: svgData('AMANDO A', 'AMANDA', '#be123c', '#4c0519'),
    url_banner: svgData('AMANDO A AMANDA', 'Comedia romántica', '#9f1239', '#020617'),
    url_trailer: '',
    sinopsis: 'Fernando está convencido de que Amanda es el amor de su vida, incluso después de separarse.',
    generos: ['Comedia', 'Romance'],
    elenco: 'Gianella Neyra, Giovanni Ciccia',
    director: 'Ani Alva Helfer',
  },
  {
    id_pelicula: 5,
    titulo: 'Backrooms',
    duracion_minutos: 110,
    clasificacion: '+14',
    promedio_resenas: 4,
    categoria_cartelera: 'Próximamente',
    estado_registro: 'ACTIVO',
    url_poster: svgData('BACKROOMS', 'No hay salida', '#ca8a04', '#422006'),
    url_banner: svgData('BACKROOMS', 'Un laberinto interminable', '#a16207', '#020617'),
    url_trailer: '',
    sinopsis: 'Un grupo de jóvenes queda atrapado en un laberinto interminable de oficinas vacías.',
    generos: ['Terror'],
    elenco: 'Bradley Gareth, Kane Parsons',
    director: 'Kane Parsons',
  },
  {
    id_pelicula: 6,
    titulo: 'The Mandalorian and Grogu',
    duracion_minutos: 133,
    clasificacion: 'APT',
    promedio_resenas: 5,
    categoria_cartelera: 'Próximamente',
    estado_registro: 'ACTIVO',
    url_poster: svgData('MANDALORIAN', '& GROGU', '#0369a1', '#082f49'),
    url_banner: svgData('MANDALORIAN & GROGU', 'Una nueva misión', '#075985', '#020617'),
    url_trailer: '',
    sinopsis: 'Din Djarin y Grogu colaboran con la Nueva República en una nueva misión.',
    generos: ['Acción', 'Aventura', 'Ciencia ficción'],
    elenco: 'Pedro Pascal, Sigourney Weaver',
    director: 'Jon Favreau',
  },
];

const cinemas = [
  {
    id_cine: 1,
    nombre_cine: 'Filmate La Molina',
    direccion: 'Av. Javier Prado Este 5400, La Molina',
    horarios_apertura: 'Lunes a Domingo: 1:00 PM - 11:00 PM',
    url_mapa_embebido: `http://127.0.0.1:${PORT}/mock-map/1`,
    estado_cine: 'Activo',
  },
  {
    id_cine: 2,
    nombre_cine: 'Filmate Miraflores',
    direccion: 'Av. Alfredo Benavides 430, Miraflores',
    horarios_apertura: 'Lunes a Domingo: 1:00 PM - 11:00 PM',
    url_mapa_embebido: `http://127.0.0.1:${PORT}/mock-map/2`,
    estado_cine: 'Activo',
  },
  {
    id_cine: 3,
    nombre_cine: 'Filmate San Isidro',
    direccion: 'Av. Camino Real 1251, San Isidro',
    horarios_apertura: 'Lunes a Domingo: 1:00 PM - 11:00 PM',
    url_mapa_embebido: `http://127.0.0.1:${PORT}/mock-map/3`,
    estado_cine: 'Activo',
  },
  {
    id_cine: 4,
    nombre_cine: 'Filmate Surco',
    direccion: 'Av. Santiago de Surco 3240, Surco',
    horarios_apertura: 'Lunes a Domingo: 1:00 PM - 11:00 PM',
    url_mapa_embebido: `http://127.0.0.1:${PORT}/mock-map/4`,
    estado_cine: 'Activo',
  },
];

const users = [
  {
    id_usuario: 5,
    nombre: 'Valeria Belén Espinoza',
    username: 'vale_espinoza',
    correo: 'valeria.es@outlook.com',
    telefono: '934125789',
    url_perfil: avatarData('VE', '#e11d48', '#172554'),
    estado_usuario: 'ACTIVO',
    bio: 'Cinéfila, amante de la ciencia ficción y de las historias peruanas.',
  },
  {
    id_usuario: 6,
    nombre: 'Mateo Sebastián Guerrero',
    username: 'mateo_g',
    correo: 'mguerrero@gmail.com',
    telefono: '941258963',
    url_perfil: avatarData('MG', '#0ea5e9', '#172554'),
    estado_usuario: 'ACTIVO',
    bio: 'Siempre buscando la siguiente gran película de aventura.',
  },
  {
    id_usuario: 7,
    nombre: 'Camila Fernanda Loli',
    username: 'cami_loli',
    correo: 'camila.loli@hotmail.com',
    telefono: '963258147',
    url_perfil: avatarData('CL', '#8b5cf6', '#312e81'),
    estado_usuario: 'ACTIVO',
    bio: 'Comedias, clásicos y un buen combo de canchita.',
  },
];

const categories = [
  { id_categoria_confi: 1, nombre_categoria: 'Combos' },
  { id_categoria_confi: 2, nombre_categoria: 'Canchita' },
  { id_categoria_confi: 3, nombre_categoria: 'Bebidas' },
  { id_categoria_confi: 4, nombre_categoria: 'Dulces' },
];

const snackImage = (title, color) => svgData(title.toUpperCase(), 'Dulcería Filmate', color, '#020617');
const products = [
  { id_producto: 1, id_categoria_confi: 1, nombre_producto: 'Combo Personal Filmate', descripcion: 'Canchita grande y gaseosa mediana', precio: 26, url_imagen: snackImage('Combo personal', '#dc2626'), stock: 500 },
  { id_producto: 2, id_categoria_confi: 1, nombre_producto: 'Combo Pareja de Estreno', descripcion: 'Canchita gigante, dos gaseosas y chocolate', precio: 45, url_imagen: snackImage('Combo pareja', '#be123c'), stock: 350 },
  { id_producto: 3, id_categoria_confi: 1, nombre_producto: 'Combo Familiar Filmate', descripcion: 'Dos canchitas, cuatro gaseosas y hot dog', precio: 75, url_imagen: snackImage('Combo familiar', '#9f1239'), stock: 200 },
  { id_producto: 6, id_categoria_confi: 2, nombre_producto: 'Canchita Familiar Salada', descripcion: 'Balde gigante de canchita salada', precio: 18, url_imagen: snackImage('Canchita salada', '#ca8a04'), stock: 900 },
  { id_producto: 7, id_categoria_confi: 2, nombre_producto: 'Canchita Familiar Dulce', descripcion: 'Balde gigante de canchita acaramelada', precio: 20, url_imagen: snackImage('Canchita dulce', '#a16207'), stock: 850 },
  { id_producto: 10, id_categoria_confi: 3, nombre_producto: 'Gaseosa Gigante XL', descripcion: 'Vaso de 32 oz', precio: 11, url_imagen: snackImage('Gaseosa XL', '#2563eb'), stock: 800 },
  { id_producto: 12, id_categoria_confi: 3, nombre_producto: 'Agua sin gas', descripcion: 'Botella personal de 500 ml', precio: 6, url_imagen: snackImage('Agua', '#0284c7'), stock: 300 },
  { id_producto: 14, id_categoria_confi: 4, nombre_producto: 'Chocolates Sublime Pack', descripcion: 'Paquete de tres unidades', precio: 8.5, url_imagen: snackImage('Chocolate', '#7c2d12'), stock: 400 },
  { id_producto: 17, id_categoria_confi: 4, nombre_producto: 'Gomitas Ácidas', descripcion: 'Paquete familiar de gomitas', precio: 6.5, url_imagen: snackImage('Gomitas', '#7e22ce'), stock: 200 },
];

const json = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });

const showtimesFor = (dateKey) => {
  const times = ['16:00:00', '18:15:00', '20:30:00'];
  const result = [];
  let id = 1000;

  cinemas.forEach((cinema, cinemaIndex) => {
    movies.slice(0, 4).forEach((movie, movieIndex) => {
      const hour = times[(cinemaIndex + movieIndex) % times.length];
      result.push({
        id_funcion: id++,
        id_pelicula: movie.id_pelicula,
        id_cine: cinema.id_cine,
        nombre_cine: cinema.nombre_cine,
        id_sala: cinemaIndex * 4 + movieIndex + 1,
        nombre_sala: movieIndex % 2 === 0 ? 'Sala 1 - IMAX' : 'Sala 2 - Estándar',
        fecha_hora: `${dateKey}T${hour}`,
        precio_base: movieIndex % 2 === 0 ? 35 : 18,
      });
    });
  });

  return result;
};

const seatMap = () => {
  const rows = 'ABCDEFGHIJKL'.split('');
  const seats = [];
  let id = 1;
  rows.forEach((row, rowIndex) => {
    for (let column = 1; column <= 14; column += 1) {
      const occupied = (rowIndex + column) % 11 === 0 || (row === 'F' && [7, 8].includes(column));
      seats.push({
        id_asiento: id++,
        fila: row,
        columna: column,
        numero: column,
        tipo_asiento: rowIndex > 8 ? 'VIP' : 'Regular',
        estado: occupied ? 'Ocupado' : 'Disponible',
      });
    }
  });
  return seats;
};

const mapHtml = (cinemaId) => {
  const cinema = cinemas.find((item) => String(item.id_cine) === String(cinemaId)) || cinemas[0];
  return `<!doctype html>
  <html><body style="margin:0;background:#dbeafe;font-family:Arial">
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 900 500">
      <rect width="900" height="500" fill="#dbeafe"/>
      <path d="M0 95h900M0 250h900M180 0v500M470 0v500M740 0v500" stroke="#fff" stroke-width="24"/>
      <path d="M0 95h900M0 250h900M180 0v500M470 0v500M740 0v500" stroke="#94a3b8" stroke-width="2"/>
      <path d="M120 420C250 280 510 380 790 120" fill="none" stroke="#60a5fa" stroke-width="20" opacity=".7"/>
      <circle cx="480" cy="245" r="34" fill="#ef4444"/>
      <path d="M480 300c-22-32-48-59-48-88a48 48 0 1 1 96 0c0 29-26 56-48 88z" fill="#ef4444"/>
      <circle cx="480" cy="210" r="16" fill="#fff"/>
      <rect x="245" y="30" width="410" height="75" rx="18" fill="#0f172a" opacity=".9"/>
      <text x="450" y="62" text-anchor="middle" fill="#fff" font-size="24" font-weight="700">${cinema.nombre_cine}</text>
      <text x="450" y="88" text-anchor="middle" fill="#cbd5e1" font-size="16">${cinema.direccion}</text>
    </svg>
  </body></html>`;
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path.startsWith('/mock-map/')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(mapHtml(path.split('/').pop()));
    return;
  }

  if (path === '/' || path === '/health') {
    json(res, 200, { status: 'healthy', mode: 'manual-screenshot-demo' });
    return;
  }

  if (path === '/auth/login' && req.method === 'POST') {
    const body = await readBody(req);
    const selected = users.find((user) => user.correo.toLowerCase() === String(body.correo || '').toLowerCase()) || users[0];
    json(res, 200, { access_token: 'manual-demo-token', token_type: 'bearer', user: selected });
    return;
  }

  if (path === '/auth/register' && req.method === 'POST') {
    const body = await readBody(req);
    json(res, 201, {
      id_usuario: 99,
      nombre: body.nombre,
      username: body.username,
      correo: body.correo,
      telefono: body.telefono,
      url_perfil: avatarData('NU', '#16a34a', '#052e16'),
      estado_usuario: 'ACTIVO',
    });
    return;
  }

  if (path === '/client/movies/' && req.method === 'GET') {
    json(res, 200, movies);
    return;
  }

  if (path === '/client/movies/search' && req.method === 'GET') {
    const query = (url.searchParams.get('q') || '').toLowerCase();
    json(res, 200, movies.filter((movie) => movie.titulo.toLowerCase().includes(query)));
    return;
  }

  const movieDetailsMatch = path.match(/^\/client\/movies\/(\d+)\/details$/);
  if (movieDetailsMatch && req.method === 'GET') {
    const movie = movies.find((item) => String(item.id_pelicula) === movieDetailsMatch[1]);
    json(res, movie ? 200 : 404, movie || { detail: 'Película no encontrada' });
    return;
  }

  if (path === '/client/cinemas/' && req.method === 'GET') {
    json(res, 200, cinemas);
    return;
  }

  const cinemaMatch = path.match(/^\/client\/cinemas\/(\d+)$/);
  if (cinemaMatch && req.method === 'GET') {
    json(res, 200, cinemas.find((item) => String(item.id_cine) === cinemaMatch[1]) || cinemas[0]);
    return;
  }

  const byDateMatch = path.match(/^\/client\/showtimes\/date\/(\d{4}-\d{2}-\d{2})$/);
  if (byDateMatch && req.method === 'GET') {
    let result = showtimesFor(byDateMatch[1]);
    const cinemaId = url.searchParams.get('cinema_id');
    const movieId = url.searchParams.get('movie_id');
    if (cinemaId) result = result.filter((item) => String(item.id_cine) === cinemaId);
    if (movieId) result = result.filter((item) => String(item.id_pelicula) === movieId);
    json(res, 200, result);
    return;
  }

  const byCinemaMatch = path.match(/^\/client\/showtimes\/cinema\/(\d+)$/);
  if (byCinemaMatch && req.method === 'GET') {
    const date = new Date().toISOString().slice(0, 10);
    json(res, 200, { funciones: showtimesFor(date).filter((item) => String(item.id_cine) === byCinemaMatch[1]) });
    return;
  }

  const seatMatch = path.match(/^\/client\/seats\/showtime\/(\d+)$/);
  if (seatMatch && req.method === 'GET') {
    json(res, 200, { id_funcion: Number(seatMatch[1]), asientos: seatMap() });
    return;
  }

  if (path === '/client/seats/lock' && req.method === 'POST') {
    json(res, 200, { success: true, expires_in_seconds: 600 });
    return;
  }

  if (path === '/client/snacks/categories' && req.method === 'GET') {
    json(res, 200, categories);
    return;
  }

  if (path === '/client/snacks/products' && req.method === 'GET') {
    json(res, 200, products);
    return;
  }

  if (path === '/client/orders/checkout' && req.method === 'POST') {
    const body = await readBody(req);
    const seatTotal = (body.ids_asientos || []).length * 35;
    const snackTotal = Number(body.monto_confiteria || 0);
    json(res, 200, {
      id_transaccion: 2026062001,
      monto_total: seatTotal + snackTotal,
      estado: 'PAGADA',
      metodo_pago: body.metodo_pago,
      qr: {
        payload_json: JSON.stringify({
          sistema: 'FILMATE',
          transaccion: 2026062001,
          usuario: body.id_usuario,
          funcion: body.id_funcion,
          asientos: body.ids_asientos,
        }),
      },
    });
    return;
  }

  const userMatch = path.match(/^\/users\/(\d+)$/);
  if (userMatch && req.method === 'GET') {
    json(res, 200, users.find((item) => String(item.id_usuario) === userMatch[1]) || users[0]);
    return;
  }

  if (userMatch && req.method === 'PUT') {
    const body = await readBody(req);
    const current = users.find((item) => String(item.id_usuario) === userMatch[1]) || users[0];
    Object.assign(current, body);
    json(res, 200, current);
    return;
  }

  const summaryMatch = path.match(/^\/client\/(?:social|actividad)\/summary\/(\d+)$/);
  if (summaryMatch && req.method === 'GET') {
    const user = users.find((item) => String(item.id_usuario) === summaryMatch[1]) || users[0];
    json(res, 200, {
      usuario: user,
      stats: {
        total_movies: user.id_usuario === 5 ? 12 : 8,
        total_reviews: user.id_usuario === 5 ? 7 : 5,
        followers: user.id_usuario === 5 ? 28 : 19,
        following: user.id_usuario === 5 ? 16 : 11,
      },
      top_favorites: user.id_usuario === 5 ? movies.slice(0, 5) : movies.slice(1, 6),
    });
    return;
  }

  const profileMatch = path.match(/^\/client\/(?:social|actividad)\/profile\/(\d+)$/);
  if (profileMatch && req.method === 'PUT') {
    const body = await readBody(req);
    json(res, 200, { id_usuario: Number(profileMatch[1]), bio: body.bio || '' });
    return;
  }

  const favoriteMatch = path.match(/^\/client\/users\/(\d+)\/favorite-movies$/);
  if (favoriteMatch && req.method === 'GET') {
    json(res, 200, movies.slice(0, 5));
    return;
  }

  if (favoriteMatch && req.method === 'PUT') {
    const body = await readBody(req);
    json(res, 200, { success: true, movie_ids: body.movie_ids || [] });
    return;
  }

  const ratingMatch = path.match(/^\/client\/reviews\/user\/(\d+)\/rating-distribution$/);
  if (ratingMatch && req.method === 'GET') {
    json(res, 200, { 1: 1, 2: 0, 3: 2, 4: 4, 5: 5 });
    return;
  }

  const ratedMatch = path.match(/^\/client\/reviews\/user\/(\d+)\/movies$/);
  if (ratedMatch && req.method === 'GET') {
    json(res, 200, movies.slice(0, 5).map((movie, index) => ({ pelicula: movie, calificacion: 5 - (index % 3) })));
    return;
  }

  if (path.startsWith('/admin/users') && req.method === 'GET') {
    json(res, 200, users);
    return;
  }

  const followingMatch = path.match(/^\/client\/seguidores\/(\d+)\/siguiendo$/);
  if (followingMatch && req.method === 'GET') {
    json(res, 200, [{ id_usuario_seguido: 7 }]);
    return;
  }

  const followersMatch = path.match(/^\/client\/seguidores\/(\d+)\/seguidores$/);
  if (followersMatch && req.method === 'GET') {
    json(res, 200, [{ id_usuario_seguidor: 6 }, { id_usuario_seguidor: 7 }]);
    return;
  }

  if ((path === '/client/seguidores/' || path === '/client/seguidores/seguir') && req.method === 'POST') {
    json(res, 201, { success: true });
    return;
  }

  json(res, 404, { detail: `Ruta de demostración no implementada: ${req.method} ${path}` });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Filmate mock API listening on http://127.0.0.1:${PORT}`);
});
