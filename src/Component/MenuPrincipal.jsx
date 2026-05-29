import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Star, X } from 'lucide-react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { useNavigate } from 'react-router-dom';
import { peliculas } from './peliculas';
import { getCinemas, getMovies, getShowtimesByCinema } from './filmateApi';

const FALLBACK_MEDIA_IMAGE =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200">
            <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#0f172a" />
                    <stop offset="50%" stop-color="#1e293b" />
                    <stop offset="100%" stop-color="#111827" />
                </linearGradient>
            </defs>
            <rect width="800" height="1200" fill="url(#g)" />
            <circle cx="400" cy="430" r="120" fill="#e11d48" opacity="0.18" />
            <text x="400" y="590" text-anchor="middle" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">Imagen no disponible</text>
        </svg>
    `);

const handleImageFallback = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_MEDIA_IMAGE;
};

export const MenuPrincipal = () => {
    const navigate = useNavigate();
    const [peliculasData, setPeliculasData] = useState(peliculas);
    const [cinemasData, setCinemasData] = useState([]);
    const [showtimeCatalog, setShowtimeCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtersLoading, setFiltersLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDay, setSelectedDay] = useState('hoy');
    const [selectedCinema, setSelectedCinema] = useState('all');
    const [selectedGenre, setSelectedGenre] = useState('all');
    const LIMA_TIME_ZONE = 'America/Lima';
    const dateKeyFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat('en-CA', {
                timeZone: LIMA_TIME_ZONE,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }),
        []
    );

    const days = [
        { value: 'hoy', label: 'Hoy' },
        { value: 'manana', label: 'Mañana' },
        { value: 'pasado', label: 'Pasado mañana' },
    ];

    const normalizeText = (value) =>
        String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();

    const getMovieGenres = (pelicula) => {
        if (Array.isArray(pelicula.generos) && pelicula.generos.length > 0) {
            return pelicula.generos.map((genre) => normalizeText(genre)).filter(Boolean);
        }

        if (pelicula.genero) {
            return String(pelicula.genero)
                .split(',')
                .map((item) => normalizeText(item))
                .filter(Boolean);
        }

        return [];
    };

    const toDateKey = (dateValue) => {
        if (typeof dateValue === 'string') {
            const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dateValue);
            const plainDateTimeMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})\s\d{2}:\d{2}:\d{2}$/);

            if (plainDateTimeMatch && !hasTimezone) {
                if (import.meta.env.DEV) {
                    console.debug('[MenuPrincipal] toDateKey plain DATETIME ->', dateValue, '=>', plainDateTimeMatch[1]);
                }
                return plainDateTimeMatch[1];
            }

            const directDateOnlyMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})$/);
            if (directDateOnlyMatch) {
                if (import.meta.env.DEV) {
                    console.debug('[MenuPrincipal] toDateKey date only ->', dateValue, '=>', directDateOnlyMatch[1]);
                }
                return directDateOnlyMatch[1];
            }
        }

        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            if (import.meta.env.DEV) {
                console.warn('[MenuPrincipal] toDateKey invalid date value:', dateValue);
            }
            return '';
        }

        const parts = dateKeyFormatter.formatToParts(date);
        const year = parts.find((part) => part.type === 'year')?.value || '';
        const month = parts.find((part) => part.type === 'month')?.value || '';
        const day = parts.find((part) => part.type === 'day')?.value || '';

        return year && month && day ? `${year}-${month}-${day}` : '';
    };

    const getOffsetDateKey = (offsetDays) => {
        const todayParts = dateKeyFormatter.formatToParts(new Date());
        const year = Number(todayParts.find((part) => part.type === 'year')?.value || 0);
        const month = Number(todayParts.find((part) => part.type === 'month')?.value || 0);
        const day = Number(todayParts.find((part) => part.type === 'day')?.value || 0);

        if (!year || !month || !day) return '';

        const utcNoon = Date.UTC(year, month - 1, day, 12);
        const targetDate = new Date(utcNoon + offsetDays * 24 * 60 * 60 * 1000);
        const key = toDateKey(targetDate);

        if (import.meta.env.DEV) {
            console.debug('[MenuPrincipal] getOffsetDateKey', {
                offsetDays,
                todayParts: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                key,
            });
        }

        return key;
    };

    useEffect(() => {
        let isMounted = true;

        const loadMovies = async () => {
            try {
                setLoading(true);
                const movies = await getMovies();

                if (!isMounted) return;

                if (movies.length > 0) {
                    setPeliculasData(movies);
                    setError('');
                } else {
                    setPeliculasData(peliculas);
                    setError('La API no devolvió películas, se muestran datos locales.');
                }
            } catch (err) {
                if (!isMounted) return;

                setPeliculasData(peliculas);
                setError('No se pudo conectar con el backend, se muestran datos locales.');
                console.error('Error cargando películas:', err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadMovies();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadFilters = async () => {
            try {
                setFiltersLoading(true);

                const cinemas = await getCinemas();
                if (!isMounted) return;
                setCinemasData(cinemas);

                if (import.meta.env.DEV) {
                    console.groupCollapsed('[MenuPrincipal] loadFilters');
                    console.log('cinemas:', cinemas);
                }

                const catalogs = await Promise.all(
                    cinemas.map(async (cinema) => {
                        try {
                            const response = await getShowtimesByCinema(cinema.id);
                            if (import.meta.env.DEV) {
                                console.log(`cinema ${cinema.id} response keys:`, response ? Object.keys(response) : []);
                                console.log(`cinema ${cinema.id} funciones count:`, Array.isArray(response?.funciones) ? response.funciones.length : 0);
                                if (Array.isArray(response?.funciones) && response.funciones.length > 0) {
                                    console.log(`cinema ${cinema.id} first funcion:`, response.funciones[0]);
                                    console.log(
                                        `cinema ${cinema.id} fecha keys:`,
                                        response.funciones.map((funcion) => ({
                                            id_funcion: funcion.id_funcion,
                                            id_pelicula: funcion.id_pelicula,
                                            fecha_hora_inicio: funcion.fecha_hora_inicio,
                                            fechaKey: toDateKey(funcion.fecha_hora_inicio),
                                        }))
                                    );
                                }
                            }
                            return {
                                cinema,
                                funciones: Array.isArray(response?.funciones) ? response.funciones : [],
                            };
                        } catch {
                            return {
                                cinema,
                                funciones: [],
                            };
                        }
                    })
                );

                if (!isMounted) return;
                setShowtimeCatalog(catalogs);

                if (import.meta.env.DEV) {
                    console.log('catalogs:', catalogs);
                    console.groupEnd();
                }
            } catch (err) {
                if (!isMounted) return;
                console.error('Error cargando filtros:', err);
                setCinemasData([]);
                setShowtimeCatalog([]);
            } finally {
                if (isMounted) {
                    setFiltersLoading(false);
                }
            }
        };

        loadFilters();

        return () => {
            isMounted = false;
        };
    }, []);

    const renderStars = (rating) => {
        return (
            <div className="flex gap-1 justify-center">
                {[...Array(5)].map((_, index) => (
                    <Star
                        key={index}
                        className={`w-5 h-5 ${
                            index < rating
                                ? 'fill-[#FF9500] text-[#FF9500]'
                                : 'fill-gray-600 text-gray-600'
                        }`}
                    />
                ))}
            </div>
        );
    };

    const irADetalle = (pelicula) => {
        navigate(`/menuPrincipal/detallePelicula/${pelicula.id}`, { state: pelicula });
    };

    const genreOptions = useMemo(() => {
        const genres = new Set();

        peliculasData.forEach((pelicula) => {
            getMovieGenres(pelicula).forEach((genre) => {
                if (genre) genres.add(genre);
            });
        });

        return Array.from(genres).sort((a, b) => a.localeCompare(b, 'es'));
    }, [peliculasData]);

    const allPeliculasSorted = useMemo(() => {
        return (peliculasData.length > 0 ? peliculasData : peliculas)
            .slice()
            .sort((a, b) => (b.estreno ? 1 : 0) - (a.estreno ? 1 : 0));
    }, [peliculasData]);

    const filteredPeliculas = useMemo(() => {
        const source = peliculasData.length > 0 ? peliculasData : peliculas;
        const todayKey = getOffsetDateKey(0);
        const tomorrowKey = getOffsetDateKey(1);
        const afterTomorrowKey = getOffsetDateKey(2);
        const matchingMovieIds = new Set();

        if (import.meta.env.DEV) {
            console.groupCollapsed('[MenuPrincipal] filteredPeliculas');
            console.log('selectedCinema:', selectedCinema);
            console.log('selectedDay:', selectedDay);
            console.log('selectedGenre:', selectedGenre);
            console.log('todayKey:', todayKey);
            console.log('tomorrowKey:', tomorrowKey);
            console.log('afterTomorrowKey:', afterTomorrowKey);
            console.log('showtimeCatalog cinemas:', showtimeCatalog.map((item) => ({
                cinemaId: item.cinema?.id,
                cinemaName: item.cinema?.nombre,
                funciones: Array.isArray(item.funciones) ? item.funciones.length : 0,
            })));
            console.log('showtimeCatalog today matches:', showtimeCatalog.map((item) => ({
                cinemaId: item.cinema?.id,
                matchesToday: Array.isArray(item.funciones)
                    ? item.funciones.filter((funcion) => toDateKey(funcion.fecha_hora_inicio) === todayKey).length
                    : 0,
                matchesTomorrow: Array.isArray(item.funciones)
                    ? item.funciones.filter((funcion) => toDateKey(funcion.fecha_hora_inicio) === tomorrowKey).length
                    : 0,
                matchesAfterTomorrow: Array.isArray(item.funciones)
                    ? item.funciones.filter((funcion) => toDateKey(funcion.fecha_hora_inicio) === afterTomorrowKey).length
                : 0,
            })));
        }

        showtimeCatalog.forEach((item) => {
            if (selectedCinema !== 'all' && String(item.cinema?.id) !== String(selectedCinema)) {
                return;
            }

            (Array.isArray(item.funciones) ? item.funciones : []).forEach((funcion) => {
                const functionDateKey = toDateKey(funcion.fecha_hora_inicio);
                const dayMatches =
                    selectedDay === 'all' ||
                    (selectedDay === 'hoy' && functionDateKey === todayKey) ||
                    (selectedDay === 'manana' && functionDateKey === tomorrowKey) ||
                    (selectedDay === 'pasado' && functionDateKey === afterTomorrowKey);

                if (dayMatches) {
                    matchingMovieIds.add(String(funcion.id_pelicula));
                }
            });
        });

        if (import.meta.env.DEV) {
            console.log('matchingMovieIds for filters:', Array.from(matchingMovieIds));
        }

        const result = source.filter((pelicula) => {
            const movieGenres = getMovieGenres(pelicula);

            if (selectedGenre !== 'all' && !movieGenres.includes(selectedGenre)) {
                return false;
            }

            if (selectedCinema === 'all' && selectedDay === 'all') {
                return true;
            }

            return matchingMovieIds.has(String(pelicula.id));
        });

        if (import.meta.env.DEV) {
            console.log('filtered result movie ids:', result.map((pelicula) => pelicula.id));
            console.groupEnd();
        }

        return result;
    }, [peliculasData, selectedCinema, selectedDay, selectedGenre, showtimeCatalog]);

    const displayPeliculas = filteredPeliculas.length > 0 ? filteredPeliculas : [];
    const hasActiveFilters = selectedCinema !== 'all' || selectedDay !== 'hoy' || selectedGenre !== 'all';
    const clearFilters = () => {
        setSelectedDay('hoy');
        setSelectedCinema('all');
        setSelectedGenre('all');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            <Header />
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
                {error && (
                    <div className="mb-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100">
                        {error}
                    </div>
                )}

                {/* Recomendaciones */}
                <section className="mb-16">
                    <h2 className="text-4xl font-bold text-white mb-8">Recomendaciones</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {loading && allPeliculasSorted.length === 0 ? (
                            <div className="col-span-full text-gray-300">Cargando películas...</div>
                        ) : (
                            allPeliculasSorted.slice(0, 3).map((pelicula, i) => (
                            <div
                                key={i}
                                onClick={() => irADetalle(pelicula)}
                                className="bg-slate-800/30 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/20 cursor-pointer group relative"
                            >
                                <div className="relative overflow-hidden">
                                    {pelicula.estreno && (
                                        <div className="absolute top-0 left-0 z-20">
                                            <div className="bg-red-500 text-white px-8 py-2 rounded-br-3xl rounded-tl-3xl font-bold text-sm shadow-lg">
                                                Estreno
                                            </div>
                                        </div>
                                    )}
                                    <img
                                        src={pelicula.imagenPoster || pelicula.imagen}
                                        alt={pelicula.titulo}
                                        className="w-full h-[550px] object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={handleImageFallback}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
                                    <h3 className="text-lg font-bold text-white mb-2">
                                        {pelicula.titulo}
                                    </h3>
                                    <p className="text-gray-300 text-sm mb-3">
                                        {pelicula.genero}, {pelicula.duracion}, {pelicula.clasificacion}
                                    </p>
                                    {renderStars(pelicula.rating)}
                                </div>
                            </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Filtros */}
                <section className="mb-16 rounded-[2rem] border border-slate-700/60 bg-slate-900/60 p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-slate-200">
                                <Filter className="h-5 w-5 text-red-400" />
                                <h2 className="text-2xl font-bold">Filtrar cartelera</h2>
                            </div>
                            <p className="text-sm text-slate-400">
                                Filtra por día, cine y género para ver solo lo que te interesa.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={clearFilters}
                            disabled={!hasActiveFilters}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <X className="h-4 w-4" />
                            Limpiar filtros
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-300">Día</label>
                            <select
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(e.target.value)}
                                className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition-colors focus:border-red-500"
                            >
                                {days.map((day) => (
                                    <option key={day.value} value={day.value}>
                                        {day.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-300">Cine</label>
                            <select
                                value={selectedCinema}
                                onChange={(e) => setSelectedCinema(e.target.value)}
                                className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition-colors focus:border-red-500"
                                disabled={filtersLoading && cinemasData.length === 0}
                            >
                                <option value="all">Todos los cines</option>
                                {cinemasData.map((cinema) => (
                                    <option key={cinema.id} value={cinema.id}>
                                        {cinema.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-300">Género</label>
                            <select
                                value={selectedGenre}
                                onChange={(e) => setSelectedGenre(normalizeText(e.target.value))}
                                className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition-colors focus:border-red-500"
                            >
                                <option value="all">Todos los géneros</option>
                                {genreOptions.map((genre) => (
                                    <option key={genre} value={genre}>
                                        {genre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Cartelera */}
                <section>
                    <h2 className="text-4xl font-bold text-white mb-8">Cartelera</h2>
                    {hasActiveFilters && displayPeliculas.length === 0 ? (
                        <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 p-6 text-slate-300">
                            No hay películas que coincidan con los filtros seleccionados.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {displayPeliculas
                                .slice() // para no mutar el original
                                .sort((a, b) => (b.estreno ? 1 : 0) - (a.estreno ? 1 : 0))
                                .map((pelicula, i) => (
                                <div
                                    key={i}
                                    onClick={() => irADetalle(pelicula)}
                                    className="bg-slate-800/30 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/20 cursor-pointer group relative"
                                >
                                    <div className="relative overflow-hidden">
                                        {pelicula.estreno && (
                                            <div className="absolute top-0 left-0 z-20">
                                                <div className="bg-red-500 text-white px-6 py-1.5 rounded-br-2xl rounded-tl-2xl font-bold text-xs shadow-lg">
                                                    Estreno
                                                </div>
                                            </div>
                                        )}
                                        <img
                                            src={pelicula.imagenPoster || pelicula.imagen}
                                            alt={pelicula.titulo}
                                            className="w-full h-[550px] object-cover group-hover:scale-110 transition-transform duration-500"
                                            onError={handleImageFallback}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 p-5 text-center">
                                        <h3 className="text-lg font-bold text-white mb-1.5">
                                            {pelicula.titulo}
                                        </h3>
                                        <p className="text-gray-300 text-sm mb-2.5">
                                            {pelicula.genero}, {pelicula.duracion}, {pelicula.clasificacion}
                                        </p>
                                        {renderStars(pelicula.rating)}
                                    </div>
                                </div>
                                ))}
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default MenuPrincipal;


