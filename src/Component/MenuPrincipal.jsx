import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Filter, Sparkles, X } from 'lucide-react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import StarRatingDisplay from './StarRatingDisplay.jsx';
import { useNavigate } from 'react-router-dom';
import { getCinemas, getMovies, getShowtimesByDate } from './filmateApi';
import { isRegisteredSession } from './authSession';
import { useHomeRecommendations } from './hooks/useHomeRecommendations.js';

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

const movieSkeletons = Array.from({ length: 6 }, (_, index) => index);
const getMovieCardKey = (pelicula) => pelicula.id || pelicula.titulo || pelicula.id_pelicula;
const estrenoScore = (pelicula) => (pelicula.estreno ? 1 : 0);

const formatDurationMinutes = (minutes) => {
    if (!minutes && minutes !== 0) return null;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours <= 0) return `${minutes} min`;
    return `${hours}h ${rest.toString().padStart(2, '0')}min`;
};

const getRecommendationGenres = (pelicula) => {
    if (Array.isArray(pelicula?.generos) && pelicula.generos.length > 0) {
        return pelicula.generos
            .map((genero) => {
                if (typeof genero === 'string') return genero;
                return genero?.nombre_genero || genero?.nombre || genero?.genero?.nombre || '';
            })
            .filter(Boolean);
    }

    if (typeof pelicula?.genero === 'string') {
        return pelicula.genero.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return [];
};

const buildRecommendedMovie = (pelicula) => {
    if (!pelicula) return null;

    const id = pelicula.id_pelicula || pelicula.id;
    const duracion = formatDurationMinutes(pelicula.duracion_minutos);

    return {
        id,
        id_pelicula: id,
        titulo: pelicula.titulo || 'Sin título',
        imagenPoster: pelicula.url_poster || pelicula.imagenPoster || '',
        imagenBanner: pelicula.url_banner || pelicula.imagenBanner || '',
        director: pelicula.director || 'Por definir',
        anio: pelicula.anio_lanzamiento || pelicula.anio || null,
        clasificacion: pelicula.clasificacion || null,
        duracion,
        duracion_minutos: pelicula.duracion_minutos ?? null,
        estado_pelicula: pelicula.estado_pelicula || null,
        rating: Number(pelicula.promedio_resenas ?? pelicula.rating ?? 0),
        totalResenas: Number(pelicula.total_resenas ?? 0),
        totalFavoritos: Number(pelicula.total_favoritos_comunidad ?? 0),
        motivo: pelicula.motivo || null,
        score: Number(pelicula.score ?? 0),
        generos: getRecommendationGenres(pelicula),
    };
};

const MovieCardSkeleton = ({ large = false }) => (
    <div className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/30">
        <div className={`${large ? 'h-[550px]' : 'h-[420px]'} animate-pulse bg-slate-700/50`} />
        <div className="space-y-3 p-5">
            <div className="mx-auto h-5 w-2/3 animate-pulse rounded-full bg-slate-700/60" />
            <div className="mx-auto h-4 w-1/2 animate-pulse rounded-full bg-slate-700/40" />
        </div>
    </div>
);

MovieCardSkeleton.propTypes = {
    large: PropTypes.bool,
};

const RecommendationCard = ({ pelicula, onSelect }) => {
    const handleClick = () => {
        if (typeof onSelect === 'function') onSelect(pelicula);
    };

    const subtitleParts = [pelicula.director, pelicula.anio].filter(Boolean);
    const subtitle = subtitleParts.join(' · ');
    const classificationOrDuration = [pelicula.clasificacion, pelicula.duracion].filter(Boolean).join(' · ');
    const motivoText = pelicula.motivo && pelicula.motivo.length > 110
        ? `${pelicula.motivo.slice(0, 107)}…`
        : pelicula.motivo;

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={`Recomendación: ${pelicula.titulo}`}
            title={pelicula.motivo || pelicula.titulo}
            className="group relative flex h-[550px] flex-col overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/30 text-left backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-red-500/50 hover:shadow-2xl hover:shadow-red-500/20"
        >
            <div className="relative h-[320px] overflow-hidden">
                <img
                    src={pelicula.imagenPoster}
                    alt={pelicula.titulo}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={handleImageFallback}
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                {pelicula.totalFavoritos > 0 && (
                    <div className="absolute right-3 top-3 z-20 rounded-full border border-amber-300/40 bg-amber-400/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-100 shadow-lg backdrop-blur-sm">
                        Popular
                    </div>
                )}
                {motivoText && (
                    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent px-4 pb-3 pt-6 text-[12px] font-medium text-slate-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        {motivoText}
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
                <div>
                    <h3 className="line-clamp-2 text-lg font-bold text-white">{pelicula.titulo}</h3>
                    {subtitle && (
                        <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
                    )}
                    {classificationOrDuration && (
                        <p className="mt-1 text-xs text-slate-400">{classificationOrDuration}</p>
                    )}
                </div>

                {pelicula.generos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {pelicula.generos.slice(0, 3).map((genero, index) => (
                            <span
                                key={`${pelicula.id}-genero-${index}`}
                                className="rounded-full border border-slate-600/70 bg-slate-700/50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-200"
                            >
                                {genero}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-auto flex items-center justify-between">
                    <span className="text-sm font-semibold text-amber-300">
                        ★ {pelicula.rating ? pelicula.rating.toFixed(1) : '—'}
                    </span>
                    {motivoText && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-red-300">
                            <Sparkles className="h-3 w-3" />
                            Para ti
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};

RecommendationCard.propTypes = {
    pelicula: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        titulo: PropTypes.string,
        imagenPoster: PropTypes.string,
        director: PropTypes.string,
        anio: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        clasificacion: PropTypes.string,
        duracion: PropTypes.string,
        motivo: PropTypes.string,
        rating: PropTypes.number,
        totalFavoritos: PropTypes.number,
        generos: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
    onSelect: PropTypes.func,
};

export const MenuPrincipal = () => {
    const navigate = useNavigate();
    const [peliculasData, setPeliculasData] = useState([]);
    const [cinemasData, setCinemasData] = useState([]);
    const [availableDays, setAvailableDays] = useState([]);
    const [filteredShowtimes, setFilteredShowtimes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtersLoading, setFiltersLoading] = useState(true);
    const [showtimesFilterLoading, setShowtimesFilterLoading] = useState(false);
    const [loadedShowtimeFilterKey, setLoadedShowtimeFilterKey] = useState('');
    const [error, setError] = useState('');
    const [selectedDay, setSelectedDay] = useState('');
    const [selectedCinema, setSelectedCinema] = useState('all');
    const [selectedGenre, setSelectedGenre] = useState('all');
    const [isMobileViewport, setIsMobileViewport] = useState(() => {
        if (typeof globalThis.window === 'undefined') return false;
        return globalThis.window.matchMedia('(max-width: 767px)').matches;
    });
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

    const normalizeText = useCallback((value) =>
        String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim(), []);

    const getMovieGenres = useCallback((pelicula) => {
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
    }, [normalizeText]);

    const formatDateKey = useCallback((date) => {
        const parts = dateKeyFormatter.formatToParts(date);
        const year = parts.find((part) => part.type === 'year')?.value || '';
        const month = parts.find((part) => part.type === 'month')?.value || '';
        const day = parts.find((part) => part.type === 'day')?.value || '';

        return year && month && day ? `${year}-${month}-${day}` : '';
    }, [dateKeyFormatter]);

    const getOffsetDateKey = useCallback((offsetDays) => {
        const todayParts = dateKeyFormatter.formatToParts(new Date());
        const year = Number(todayParts.find((part) => part.type === 'year')?.value || 0);
        const month = Number(todayParts.find((part) => part.type === 'month')?.value || 0);
        const day = Number(todayParts.find((part) => part.type === 'day')?.value || 0);

        if (!year || !month || !day) return '';

        const utcNoon = Date.UTC(year, month - 1, day, 12);
        const targetDate = new Date(utcNoon + offsetDays * 24 * 60 * 60 * 1000);
        return formatDateKey(targetDate);
    }, [dateKeyFormatter, formatDateKey]);

    const formatDayLabel = useCallback((dateKey) => {
        const relativeLabels = {
            [getOffsetDateKey(0)]: 'Hoy',
            [getOffsetDateKey(1)]: 'Mañana',
            [getOffsetDateKey(2)]: 'Pasado mañana',
        };

        if (relativeLabels[dateKey]) return relativeLabels[dateKey];

        const parsedDate = new Date(`${dateKey}T12:00:00`);
        if (Number.isNaN(parsedDate.getTime())) return dateKey;

        const label = new Intl.DateTimeFormat('es-PE', {
            timeZone: LIMA_TIME_ZONE,
            weekday: 'short',
            day: '2-digit',
            month: 'short',
        }).format(parsedDate);

        return label.charAt(0).toUpperCase() + label.slice(1);
    }, [getOffsetDateKey]);

    useEffect(() => {
        if (typeof globalThis.window === 'undefined') return undefined;

        const mediaQuery = globalThis.window.matchMedia('(max-width: 767px)');
        const handleChange = (event) => {
            setIsMobileViewport(event.matches);
        };

        setIsMobileViewport(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

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
                    setPeliculasData([]);
                    setError('La API no devolvió películas.');
                }
            } catch (err) {
                if (!isMounted) return;

                setPeliculasData([]);
                setError('No se pudo conectar con el backend.');
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

                const nextDateKeys = Array.from({ length: 14 }, (_, index) => getOffsetDateKey(index)).filter(Boolean);
                const dayEntries = await Promise.all(
                    nextDateKeys.map(async (dateKey) => {
                        try {
                            const funciones = await getShowtimesByDate(dateKey);
                            return [dateKey, Array.isArray(funciones) ? funciones : []];
                        } catch (err) {
                            if (import.meta.env.DEV) {
                                console.warn(
                                    `[MenuPrincipal] No se pudieron cargar funciones para ${dateKey}`,
                                    err
                                );
                            }

                            return [dateKey, []];
                        }
                    })
                );
                const daysWithShowtimes = dayEntries
                    .filter(([, funciones]) => funciones.length > 0)
                    .map(([dateKey]) => dateKey);

                if (!isMounted) return;
                setAvailableDays(daysWithShowtimes);
                setSelectedDay((currentDay) => {
                    if (currentDay && daysWithShowtimes.includes(currentDay)) {
                        return currentDay;
                    }

                    const todayKey = getOffsetDateKey(0);
                    return daysWithShowtimes.includes(todayKey) ? todayKey : daysWithShowtimes[0] || '';
                });
            } catch (err) {
                if (!isMounted) return;
                console.error('Error cargando filtros:', err);
                setCinemasData([]);
                setAvailableDays([]);
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
    }, [getOffsetDateKey]);

    useEffect(() => {
        let isMounted = true;

        const loadSelectedDayShowtimes = async () => {
            if (!selectedDay) {
                setFilteredShowtimes([]);
                setShowtimesFilterLoading(false);
                setLoadedShowtimeFilterKey('');
                return;
            }

            const showtimeFilterKey = `${selectedDay}|${selectedCinema}`;

            try {
                setShowtimesFilterLoading(true);
                const funciones = await getShowtimesByDate(selectedDay, {
                    cinemaId: selectedCinema === 'all' ? undefined : selectedCinema,
                });

                if (!isMounted) return;
                setFilteredShowtimes(Array.isArray(funciones) ? funciones : []);
                setLoadedShowtimeFilterKey(showtimeFilterKey);
            } catch (err) {
                if (!isMounted) return;
                console.error('Error cargando funciones del filtro:', err);
                setFilteredShowtimes([]);
                setLoadedShowtimeFilterKey(showtimeFilterKey);
            } finally {
                if (isMounted) {
                    setShowtimesFilterLoading(false);
                }
            }
        };

        loadSelectedDayShowtimes();

        return () => {
            isMounted = false;
        };
    }, [selectedCinema, selectedDay]);

    const days = useMemo(() => {
        return availableDays
            .slice()
            .sort((firstDay, secondDay) => firstDay.localeCompare(secondDay))
            .map((dateKey) => ({
                value: dateKey,
                label: formatDayLabel(dateKey),
            }));
    }, [availableDays, formatDayLabel]);

    const renderStars = (rating) => {
        return (
            <StarRatingDisplay
                rating={rating}
                justifyClass="justify-center"
                emptyClass="text-gray-600"
            />
        );
    };

    const recommendationLimit = isMobileViewport ? 6 : 10;
    const isPersonalizedEnabled = isRegisteredSession();
    const {
        data: recomendacionesPersonalizadas,
        loading: recomendacionesLoading,
        error: recomendacionesError,
        signals: recomendacionesSignals,
    } = useHomeRecommendations({ limit: recommendationLimit, autoFetch: isPersonalizedEnabled });

    const recomendacionesNormalizadas = useMemo(
        () => recomendacionesPersonalizadas.map(buildRecommendedMovie).filter(Boolean),
        [recomendacionesPersonalizadas]
    );

    const recomendacionesVisibles = useMemo(() => {
        if (!isPersonalizedEnabled) {
            return displayPeliculas.slice(0, 3);
        }
        if (recomendacionesLoading && recomendacionesNormalizadas.length === 0) {
            return [];
        }
        if (recomendacionesError) {
            return displayPeliculas.slice(0, 3);
        }
        if (recomendacionesNormalizadas.length === 0) {
            return displayPeliculas.slice(0, 3);
        }
        return recomendacionesNormalizadas;
    }, [
        displayPeliculas,
        isPersonalizedEnabled,
        recomendacionesError,
        recomendacionesLoading,
        recomendacionesNormalizadas,
    ]);

    const recomendacionesEnCarga = isPersonalizedEnabled
        ? recomendacionesLoading && recomendacionesNormalizadas.length === 0
        : isCatalogLoading;

    const recomendacionesHeader = isPersonalizedEnabled && recomendacionesNormalizadas.length > 0
        ? 'Recomendado para ti'
        : 'Recomendaciones';

    const irADetalle = (pelicula) => {
        navigate(`/menuPrincipal/detallePelicula/${pelicula.id}`, {
            state: {
                ...pelicula,
                selectedDateKey: selectedDay || defaultDay,
                selectedDateLabel: days.find((day) => day.value === (selectedDay || defaultDay))?.label || '',
            },
        });
    };

    const genreOptions = useMemo(() => {
        const genres = new Set();

        peliculasData.forEach((pelicula) => {
            getMovieGenres(pelicula).forEach((genre) => {
                if (genre) genres.add(genre);
            });
        });

        return Array.from(genres).sort((a, b) => a.localeCompare(b, 'es'));
    }, [getMovieGenres, peliculasData]);

    const filteredPeliculas = useMemo(() => {
        const matchingMovieIds = new Set(
            filteredShowtimes.map((funcion) => String(funcion.id_pelicula))
        );
        const shouldFilterByShowtimes = selectedDay && !filtersLoading;

        const result = peliculasData.filter((pelicula) => {
            const movieGenres = getMovieGenres(pelicula);

            if (selectedGenre !== 'all' && !movieGenres.includes(selectedGenre)) {
                return false;
            }

            if (!shouldFilterByShowtimes) {
                return true;
            }

            return matchingMovieIds.has(String(pelicula.id));
        });

        return result;
    }, [filteredShowtimes, filtersLoading, getMovieGenres, peliculasData, selectedDay, selectedGenre]);

    const displayPeliculas = useMemo(
        () =>
            filteredPeliculas
                .slice()
                .sort((a, b) => estrenoScore(b) - estrenoScore(a)),
        [filteredPeliculas]
    );
    const currentShowtimeFilterKey = selectedDay ? `${selectedDay}|${selectedCinema}` : '';
    const showtimesReadyForCurrentFilter = !selectedDay || loadedShowtimeFilterKey === currentShowtimeFilterKey;
    const isCatalogLoading =
        loading ||
        filtersLoading ||
        (days.length > 0 && !selectedDay) ||
        showtimesFilterLoading ||
        !showtimesReadyForCurrentFilter;
    const defaultDay = days.find((day) => day.value === getOffsetDateKey(0))?.value || days[0]?.value || '';
    const hasActiveFilters = selectedCinema !== 'all' || selectedDay !== defaultDay || selectedGenre !== 'all';
    const clearFilters = () => {
        setSelectedDay(defaultDay);
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
                <section className="mb-16" aria-label={recomendacionesHeader}>
                    <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="flex items-center gap-3 text-4xl font-bold text-white">
                                {isPersonalizedEnabled && (
                                    <Sparkles className="h-7 w-7 text-red-400" aria-hidden="true" />
                                )}
                                {recomendacionesHeader}
                            </h2>
                            {isPersonalizedEnabled && recomendacionesSignals ? (
                                <p className="mt-1 text-sm text-slate-400">
                                    Basado en tus {recomendacionesSignals.peliculas_favoritas_count ?? 0} favoritas,
                                    {' '}
                                    {recomendacionesSignals.resenas_5_estrellas_count ?? 0} reseñas de 5 estrellas
                                    {' '}
                                    y los géneros que más consumes.
                                </p>
                            ) : (
                                <p className="mt-1 text-sm text-slate-400">
                                    Inicia sesión para obtener recomendaciones hechas a tu medida.
                                </p>
                            )}
                        </div>
                        {isPersonalizedEnabled && recomendacionesVisibles.length > 0 && (
                            <span className="inline-flex items-center gap-2 self-start rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-200">
                                <Sparkles className="h-3 w-3" />
                                Personalizado
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {recomendacionesEnCarga ? (
                            movieSkeletons.slice(0, 3).map((item) => (
                                <MovieCardSkeleton key={item} large />
                            ))
                        ) : recomendacionesVisibles.length === 0 ? (
                            <div className="col-span-full rounded-3xl border border-slate-700/50 bg-slate-800/30 p-6 text-slate-300">
                                No hay peliculas con funciones disponibles en la fecha seleccionada.
                            </div>
                        ) : isPersonalizedEnabled && recomendacionesNormalizadas.length > 0 ? (
                            recomendacionesVisibles.map((pelicula) => (
                                <RecommendationCard
                                    key={`recommended-${getMovieCardKey(pelicula)}`}
                                    pelicula={pelicula}
                                    onSelect={irADetalle}
                                />
                            ))
                        ) : (
                            recomendacionesVisibles.map((pelicula) => (
                            <button
                                type="button"
                                key={`recommended-${getMovieCardKey(pelicula)}`}
                                onClick={() => irADetalle(pelicula)}
                                className="bg-slate-800/30 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/20 cursor-pointer group relative text-left"
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
                            </button>
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
                            <label htmlFor="cartelera-dia" className="mb-2 block text-sm font-semibold text-slate-300">Día</label>
                            <select
                                id="cartelera-dia"
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(e.target.value)}
                                className="w-full rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition-colors focus:border-red-500"
                                disabled={filtersLoading || days.length === 0}
                            >
                                {days.length === 0 && (
                                    <option value="">Sin funciones disponibles</option>
                                )}
                                {days.map((day) => (
                                    <option key={day.value} value={day.value}>
                                        {day.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="cartelera-cine" className="mb-2 block text-sm font-semibold text-slate-300">Cine</label>
                            <select
                                id="cartelera-cine"
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
                            <label htmlFor="cartelera-genero" className="mb-2 block text-sm font-semibold text-slate-300">Género</label>
                            <select
                                id="cartelera-genero"
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
                    {isCatalogLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {movieSkeletons.map((item) => (
                                <MovieCardSkeleton key={item} />
                            ))}
                        </div>
                    ) : displayPeliculas.length === 0 ? (
                        <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 p-6 text-slate-300">
                            No hay peliculas con funciones para la fecha seleccionada.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {displayPeliculas.map((pelicula) => (
                                <button
                                    type="button"
                                    key={`movie-${getMovieCardKey(pelicula)}`}
                                    onClick={() => irADetalle(pelicula)}
                                    className="bg-slate-800/30 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/20 cursor-pointer group relative text-left"
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
                                </button>
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
