import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Clock3, Clapperboard, Play, X } from 'lucide-react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import StarRatingDisplay from './StarRatingDisplay.jsx';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createSeatWebSocket, getCinemas, getMovieById, getMovieReviews, getRoomById, getRooms, getSeatMap, getShowtimesByDate, getSystemConfig, normalizeSeat } from './filmateApi';

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
            <rect x="70" y="80" width="660" height="1040" rx="36" fill="none" stroke="#475569" stroke-width="6" stroke-dasharray="18 16" />
            <circle cx="400" cy="430" r="120" fill="#e11d48" opacity="0.18" />
            <path d="M305 450l70-70 60 60 55-55 105 105v95H305z" fill="#cbd5e1" opacity="0.75" />
            <path d="M280 790h240c48 0 86-38 86-86v-36l-132-132-65 65-95-95-134 134v64c0 28 22 50 50 50z" fill="#cbd5e1" opacity="0.45" />
            <text x="400" y="1000" text-anchor="middle" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700">Imagen no disponible</text>
        </svg>
    `);

const handleImageFallback = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_MEDIA_IMAGE;
};

const getShowtimeDateTime = (showtime) =>
    showtime?.fecha_hora_inicio || showtime?.fecha_hora || showtime?.horario || '';

const LIMA_TIME_ZONE = 'America/Lima';

const detailDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIMA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

const formatDateKey = (date) => {
    const parts = detailDateFormatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value || '';
    const month = parts.find((part) => part.type === 'month')?.value || '';
    const day = parts.find((part) => part.type === 'day')?.value || '';

    return year && month && day ? `${year}-${month}-${day}` : '';
};

const getOffsetDateKey = (offsetDays) => {
    const todayParts = detailDateFormatter.formatToParts(new Date());
    const year = Number(todayParts.find((part) => part.type === 'year')?.value || 0);
    const month = Number(todayParts.find((part) => part.type === 'month')?.value || 0);
    const day = Number(todayParts.find((part) => part.type === 'day')?.value || 0);

    if (!year || !month || !day) return '';

    const utcNoon = Date.UTC(year, month - 1, day, 12);
    return formatDateKey(new Date(utcNoon + offsetDays * 24 * 60 * 60 * 1000));
};

const getShowtimeDateKey = (showtime) => {
    const value = getShowtimeDateTime(showtime);
    const rawDate = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (rawDate) return rawDate;

    return value ? formatDateKey(new Date(value)) : '';
};

const formatShowtimeDateTime = (showtime, forcedDateKey = '') => {
    const value = getShowtimeDateTime(showtime);
    if (!value) return 'Horario por definir';

    const dateKey = forcedDateKey || getShowtimeDateKey(showtime);
    const timeMatch = String(value).match(/(\d{1,2}):(\d{2})/);
    const timeText = timeMatch
        ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
        : new Date(value).toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
        });

    if (!dateKey) return timeText;

    const [year, month, day] = dateKey.split('-');
    return `${day}/${month}/${year}, ${timeText}`;
};

const formatShowtimeTime = (showtime) => {
    const value = getShowtimeDateTime(showtime);
    return value
        ? new Date(value).toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
        })
        : 'Horario';
};

const getSeatNumber = (seat) => seat?.numero ?? seat?.columna ?? '';

const parseSeatSocketSeats = (event) => {
    const message = JSON.parse(event.data);
    const data = message?.data || message;

    return Array.isArray(data?.asientos)
        ? data.asientos.map(normalizeSeat)
        : [];
};

const keepAvailableSelectedSeats = (selectedSeats, nextSeats) =>
    selectedSeats.filter((selectedSeat) =>
        nextSeats.some(
            (seat) =>
                seat.id_asiento === selectedSeat.id_asiento &&
                seat.estado === 'Disponible'
        )
    );

const reviewRelativeTimeFormatter = new Intl.RelativeTimeFormat('es', {
    numeric: 'always',
});

const formatReviewAge = (dateValue) => {
    if (!dateValue) return 'Fecha no disponible';

    const reviewDate = new Date(dateValue);
    if (Number.isNaN(reviewDate.getTime())) return 'Fecha no disponible';

    const differenceMs = reviewDate.getTime() - Date.now();
    const absoluteDifference = Math.abs(differenceMs);

    if (absoluteDifference < 10 * 1000) return 'hace unos segundos';

    const units = [
        ['year', 365 * 24 * 60 * 60 * 1000],
        ['month', 30 * 24 * 60 * 60 * 1000],
        ['week', 7 * 24 * 60 * 60 * 1000],
        ['day', 24 * 60 * 60 * 1000],
        ['hour', 60 * 60 * 1000],
        ['minute', 60 * 1000],
        ['second', 1000],
    ];
    const [unit, unitMs] = units.find(([, milliseconds]) => absoluteDifference >= milliseconds) || units.at(-1);

    return reviewRelativeTimeFormatter.format(Math.round(differenceMs / unitMs), unit);
};

const ReviewCard = ({ review, modal = false }) => {
    const avatarSizeClass = modal ? 'h-14 w-14' : 'h-12 w-12';
    const usernameSizeClass = modal ? 'text-lg' : 'text-sm';
    const cardClass = modal
        ? 'rounded-2xl border border-slate-600/50 bg-slate-700/30 p-6 backdrop-blur-sm'
        : 'rounded-3xl border border-slate-700/50 bg-slate-800/30 p-5 backdrop-blur-sm';
    const initial = String(review.usuario || 'U').replace(/^@/, '').charAt(0).toUpperCase();

    return (
        <article className={cardClass}>
            <div className="mb-3 flex items-start gap-3">
                <div className={`relative flex ${avatarSizeClass} flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-600 bg-slate-700 font-bold text-slate-200`}>
                    <span aria-hidden="true">{initial}</span>
                    {review.avatar && (
                        <img
                            src={review.avatar}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(event) => {
                                event.currentTarget.style.display = 'none';
                            }}
                        />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className={`${usernameSizeClass} truncate font-bold text-white`}>{review.usuario}</p>
                        <time
                            dateTime={review.fechaPublicacion || undefined}
                            className="text-xs font-medium text-slate-400"
                        >
                            {formatReviewAge(review.fechaPublicacion)}
                        </time>
                    </div>
                    <StarRatingDisplay
                        rating={review.rating}
                        sizeClass="h-4 w-4"
                        justifyClass="justify-start"
                        emptyClass="text-gray-400"
                    />
                </div>
            </div>
            <p className={`${modal ? '' : 'text-sm'} whitespace-pre-wrap text-gray-300`}>
                {review.texto || 'Sin comentario.'}
            </p>
        </article>
    );
};

const getCinemaByRoomId = (roomId) => {
    const id = Number(roomId);
    if (id >= 1 && id <= 5) return { id: 1, nombre: 'Filmate La Molina' };
    if (id >= 6 && id <= 9) return { id: 2, nombre: 'Filmate Miraflores' };
    if (id >= 10 && id <= 13) return { id: 3, nombre: 'Filmate San Isidro' };
    if (id >= 14 && id <= 19) return { id: 4, nombre: 'Filmate Surco' };
    return { id: `sala-${roomId || 'sin-sede'}`, nombre: 'Sede por definir' };
};

const normalizeRoomType = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (/^stand\.?$/i.test(normalized) || /^est[aá]ndar$/i.test(normalized)) return 'Estándar';
    return normalized.toUpperCase();
};

const getShowFormat = (showtime) => {
    const room = showtime?.room || showtime?.salaDetalle || {};
    const format = String(
        showtime?.tipo_formato ||
        showtime?.tipoFormato ||
        room?.tipo_formato ||
        room?.tipoFormato ||
        ''
    ).trim().toUpperCase();
    const roomType = normalizeRoomType(
        showtime?.tipo_sala ||
        showtime?.tipoSala ||
        room?.tipo_sala ||
        room?.tipoSala
    );

    if (format && roomType && roomType !== 'Estándar' && roomType !== format) {
        return `${roomType} · ${format}`;
    }

    if (format) return format;
    if (roomType) return roomType;

    const roomName = String(showtime?.nombre_sala || showtime?.sala || '');
    const inferred = roomName.match(/\b(IMAX|4DX|VIP|3D|2D|EST[ÁA]NDAR)\b/i)?.[1];
    return normalizeRoomType(inferred) || 'Sala estándar';
};

const SeatGlyph = ({
    seatSize = 36,
    seatNumber = '',
    selected = false,
    unavailable = false,
    showNumber = true,
}) => {
    const c = selected
        ? { sit: '#1D9E75', sitS: '#0F6E56', back: '#0F6E56', backS: '#085041', arms: '#085041', num: '#ffffff' }
        : unavailable
            ? { sit: '#ef4444', sitS: '#b91c1c', back: '#dc2626', backS: '#991b1b', arms: '#dc2626', num: '#ffffff' }
            : { sit: '#e8e7e2', sitS: '#c8c7c0', back: '#d0cfca', backS: '#b8b7b0', arms: '#c4c3bd', num: '#444441' };

    const h = Math.round(seatSize * 1.11);

    return (
        <svg width={seatSize} height={h} viewBox="0 0 36 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="3" width="4" height="18" rx="2" fill={c.arms} />
            <rect x="31" y="3" width="4" height="18" rx="2" fill={c.arms} />
            <rect x="6" y="1" width="24" height="24" rx="7" fill={c.sit} stroke={c.sitS} strokeWidth="1.2" />
            <rect x="4" y="28" width="28" height="10" rx="4" fill={c.back} stroke={c.backS} strokeWidth="1" />
            {showNumber && (
                <text x="18" y="17" textAnchor="middle" fontSize="10" fontWeight="700" fill={c.num} fontFamily="sans-serif">
                    {seatNumber}
                </text>
            )}
            {selected && (
                <rect x="1" y="1" width="34" height="38" rx="8" fill="none" stroke="#5DCAA5" strokeWidth="2" />
            )}
            {unavailable && (
                <>
                    <line x1="11" y1="6" x2="25" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                    <line x1="25" y1="6" x2="11" y2="20" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                </>
            )}
        </svg>
    );
};

export const DetallePelicula = () => {
    const { movieId } = useParams();
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showTrailer, setShowTrailer] = useState(false);
    const [selectedShow, setSelectedShow] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [showtimeCatalog, setShowtimeCatalog] = useState([]);
    const [showtimesLoading, setShowtimesLoading] = useState(true);
    const [showtimesError, setShowtimesError] = useState('');
    const [seatMap, setSeatMap] = useState([]);
    const [seatMapLoading, setSeatMapLoading] = useState(false);
    const [seatMapError, setSeatMapError] = useState('');
    const [showSeatHelp, setShowSeatHelp] = useState(false);
    const [showSeatConfirm, setShowSeatConfirm] = useState(false);
    const [movieDetails, setMovieDetails] = useState(null);
    const [movieLoading, setMovieLoading] = useState(Boolean(movieId));
    const [movieError, setMovieError] = useState('');
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(Boolean(movieId));
    const [reviewsError, setReviewsError] = useState('');
    const [systemConfig, setSystemConfig] = useState({ limiteAsientosPorTransaccion: 10 });
    const location = useLocation();
    const navigate = useNavigate();
    const seatGridRef = useRef(null);
    const [seatGridWidth, setSeatGridWidth] = useState(0);
    const loadedSeatMapFunctionIdRef = useRef(null);

    const pelicula = movieDetails || location.state?.movieState || location.state;
    const returnSeatSelection =
        location.state?.returnToSeatSelection ||
        (location.state?.selectedShow ? location.state : null);
    const selectedShowtimeDateKey =
        returnSeatSelection?.selectedDateKey ||
        location.state?.selectedDateKey ||
        getOffsetDateKey(0);
    const selectedShowtimeDateLabel =
        returnSeatSelection?.selectedDateLabel ||
        location.state?.selectedDateLabel ||
        selectedShowtimeDateKey;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        let isMounted = true;

        getSystemConfig()
            .then((config) => {
                if (isMounted) setSystemConfig(config);
            })
            .catch(() => {
                if (isMounted) setSystemConfig({ limiteAsientosPorTransaccion: 10 });
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadMovieDetails = async () => {
            if (!movieId) {
                setMovieLoading(false);
                return;
            }

            try {
                setMovieLoading(true);
                setMovieError('');

                const details = await getMovieById(movieId);

                if (!isMounted) return;

                setMovieDetails(details);
            } catch (err) {
                if (!isMounted) return;

                console.error('Error cargando detalle completo de la película:', err);
                setMovieError('No se pudo cargar la información completa de la película.');
            } finally {
                if (isMounted) {
                    setMovieLoading(false);
                }
            }
        };

        loadMovieDetails();

        return () => {
            isMounted = false;
        };
    }, [movieId]);

    useEffect(() => {
        const reviewMovieId = pelicula?.id || movieId;
        let isMounted = true;

        const loadReviews = async () => {
            if (!reviewMovieId) {
                setReviews([]);
                setReviewsLoading(false);
                return;
            }

            try {
                setReviewsLoading(true);
                setReviewsError('');
                const movieReviews = await getMovieReviews(reviewMovieId);

                if (!isMounted) return;
                setReviews(movieReviews);
            } catch (err) {
                if (!isMounted) return;
                console.error('Error cargando reseñas de la película:', err);
                setReviews([]);
                setReviewsError('No se pudieron cargar las reseñas de la comunidad.');
            } finally {
                if (isMounted) {
                    setReviewsLoading(false);
                }
            }
        };

        loadReviews();

        return () => {
            isMounted = false;
        };
    }, [movieId, pelicula?.id]);

    useEffect(() => {
        let isMounted = true;

        const loadShowtimes = async () => {
            if (!pelicula?.id) {
                if (isMounted) {
                    setShowtimesLoading(false);
                    setShowtimeCatalog([]);
                }
                return;
            }

            try {
                setShowtimesLoading(true);
                setShowtimesError('');

                const [showtimesResult, cinemasResult, roomsResult] = await Promise.allSettled([
                    getShowtimesByDate(selectedShowtimeDateKey, {
                        movieId: pelicula.id,
                    }),
                    getCinemas(),
                    getRooms(),
                ]);

                if (showtimesResult.status === 'rejected') {
                    throw showtimesResult.reason;
                }

                const funciones = showtimesResult.value;
                const cinemas = cinemasResult.status === 'fulfilled' ? cinemasResult.value : [];
                const rooms = roomsResult.status === 'fulfilled' ? roomsResult.value : [];
                const cinemasById = new Map(cinemas.map((cinema) => [String(cinema.id), cinema]));
                const roomsById = new Map(rooms.map((room) => [String(room.id), room]));
                const funcionesOrdenadas = Array.isArray(funciones)
                    ? funciones
                        .filter((funcion) => getShowtimeDateKey(funcion) === selectedShowtimeDateKey)
                        .sort((a, b) => new Date(getShowtimeDateTime(a)) - new Date(getShowtimeDateTime(b)))
                    : [];

                const funcionesByCinema = funcionesOrdenadas.reduce((acc, funcion) => {
                    const room = roomsById.get(String(funcion.id_sala));
                    const cinemaFromCatalog = cinemasById.get(String(funcion.id_cine ?? room?.id_cine));
                    const cinemaName =
                        funcion.nombre_cine ||
                        cinemaFromCatalog?.nombre ||
                        funcion.cinema?.nombre_cine ||
                        funcion.cinema?.nombre ||
                        funcion.cine?.nombre_cine ||
                        funcion.cine?.nombre ||
                        null;
                    const cinema = cinemaName
                        ? { id: funcion.id_cine ?? room?.id_cine ?? cinemaFromCatalog?.id ?? cinemaName, nombre: cinemaName }
                        : getCinemaByRoomId(funcion.id_sala);
                    const cinemaKey = String(cinema.id);

                    if (!acc[cinemaKey]) {
                        acc[cinemaKey] = {
                            cinema,
                            funciones: [],
                        };
                    }

                    acc[cinemaKey].funciones.push({
                        ...funcion,
                        id_cine: funcion.id_cine ?? room?.id_cine ?? cinemaFromCatalog?.id,
                        nombre_cine: cinema.nombre,
                        nombre_sala: funcion.nombre_sala || room?.nombre || funcion.sala || `Sala ${funcion.id_sala || ''}`.trim(),
                    });
                    return acc;
                }, {});
                const catalogs = Object.values(funcionesByCinema);

                if (!isMounted) return;

                setShowtimeCatalog(catalogs.filter((item) => item.funciones.length > 0));
            } catch (err) {
                if (!isMounted) return;
                console.error('Error cargando horarios reales:', err);
                setShowtimesError('No se pudieron cargar los horarios reales. Se muestran horarios de respaldo.');
                setShowtimeCatalog([]);
            } finally {
                if (isMounted) {
                    setShowtimesLoading(false);
                }
            }
        };

        loadShowtimes();

        return () => {
            isMounted = false;
        };
    }, [pelicula?.id, selectedShowtimeDateKey]);

    useEffect(() => {
        if (!returnSeatSelection) return;

        const timer = window.setTimeout(() => {
            if (returnSeatSelection.selectedShow) {
                setSelectedShow(returnSeatSelection.selectedShow);
            }

            if (Array.isArray(returnSeatSelection.selectedSeats)) {
                setSelectedSeats(returnSeatSelection.selectedSeats);
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [returnSeatSelection]);

    useEffect(() => {
        const functionId = selectedShow?.id_funcion;
        if (!functionId || loadedSeatMapFunctionIdRef.current === functionId) return;

        let isMounted = true;

        const loadSeatMap = async () => {
            try {
                setSeatMapLoading(true);
                setSeatMapError('');

                const response = await getSeatMap(functionId);
                if (!isMounted) return;

                const nextSeats = Array.isArray(response?.asientos) ? response.asientos : [];
                setSeatMap(nextSeats);
                setSelectedSeats((current) => keepAvailableSelectedSeats(current, nextSeats));
                loadedSeatMapFunctionIdRef.current = functionId;
            } catch (err) {
                if (!isMounted) return;
                console.error('Error cargando mapa de asientos:', err);
                setSeatMapError('No se pudo cargar el mapa de asientos real.');
                setSeatMap([]);
            } finally {
                if (isMounted) {
                    setSeatMapLoading(false);
                }
            }
        };

        loadSeatMap();

        return () => {
            isMounted = false;
        };
    }, [selectedShow?.id_funcion]);

    useEffect(() => {
        const functionId = selectedShow?.id_funcion;
        if (!functionId) return undefined;

        const socket = createSeatWebSocket(functionId);
        if (!socket) return undefined;

        const handleSeatSocketMessage = (event) => {
            try {
                const nextSeats = parseSeatSocketSeats(event);

                if (!nextSeats.length) return;

                setSeatMap(nextSeats);
                loadedSeatMapFunctionIdRef.current = functionId;
                setSeatMapError('');
                setSelectedSeats((current) => keepAvailableSelectedSeats(current, nextSeats));
            } catch (err) {
                console.error('Error procesando websocket de asientos:', err);
            }
        };

        socket.onmessage = handleSeatSocketMessage;

        socket.onerror = () => {
            console.warn('No se pudo mantener la sincronizacion en vivo de asientos.');
        };

        return () => {
            socket.close();
        };
    }, [selectedShow?.id_funcion]);

    useEffect(() => {
        const container = seatGridRef.current;
        if (!container || typeof ResizeObserver === 'undefined') return undefined;

        const observer = new ResizeObserver(([entry]) => {
            if (entry) setSeatGridWidth(entry.contentRect.width);
        });
        observer.observe(container);

        return () => observer.disconnect();
    }, [selectedShow, seatMap.length]);

    if (movieLoading && !movieDetails && !location.state) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
                <Header />
                <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center w-full">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Cargando información de la película
                    </h2>
                    <p className="text-gray-300 mb-8">
                        Estamos trayendo género, reparto y detalles completos desde el backend.
                    </p>
                </div>
                <Footer />
            </div>
        );
    }

    if (!pelicula) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
                <Header />
                <div className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center w-full">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        No se encontró información de la película
                    </h2>
                    <p className="text-gray-300 mb-8">
                        Por favor vuelve a la cartelera y selecciona una película.
                    </p>
                    <button
                        onClick={() => navigate('/menuPrincipal')}
                        className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:scale-105"
                    >
                        Volver a Cartelera
                    </button>
                </div>
            </div>
        );
    }

    const renderStars = (rating, centered = false) => (
        <StarRatingDisplay
            rating={rating}
            sizeClass="h-4 w-4"
            justifyClass={centered ? 'justify-center' : 'justify-start'}
            emptyClass="text-gray-400"
        />
    );

    const poster = pelicula.imagenPoster || pelicula.imagen || FALLBACK_MEDIA_IMAGE;
    const trailerImg = pelicula.imagenTrailer || pelicula.imagenPoster || pelicula.imagen || FALLBACK_MEDIA_IMAGE;
    const titulo = pelicula.titulo || 'Película';
    const generos = Array.isArray(pelicula.generos) && pelicula.generos.length
        ? pelicula.generos
        : pelicula.genero
            ? String(pelicula.genero).split(',').map((item) => item.trim()).filter(Boolean)
            : [];
    const rating = pelicula.rating || 0;
    const sinopsis = pelicula.sinopsis || 'Sinopsis próxima a actualizar.';
    const directores = Array.isArray(pelicula.directores) && pelicula.directores.length
        ? pelicula.directores
        : pelicula.director
            ? String(pelicula.director).split(',').map((item) => item.trim()).filter(Boolean)
            : [];
    const director = directores.length ? directores.join(', ') : 'Por definir';
    const actores = Array.isArray(pelicula.actores) && pelicula.actores.length
        ? pelicula.actores
        : pelicula.reparto
            ? String(pelicula.reparto).split(',').map((item) => item.trim()).filter(Boolean)
            : [];
    const textoTrailer = pelicula.trailer || 'TRÁILER OFICIAL';
    const trailerUrl = pelicula.trailerUrl || '';

    const generoChips = generos.length ? generos : ['Género no disponible'];
    const repartoLista = actores.length ? actores : ['Por definir'];
    const chipStyle = "rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1 text-sm text-gray-200";

    const getYouTubeVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYouTubeVideoId(trailerUrl);
    const trailerPreview = videoId
        ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        : trailerImg;

    const getShowtimeSortValue = (showtime) => {
        const rawValue = String(
            showtime?.fecha_hora_inicio ??
            showtime?.fecha_inicio ??
            showtime?.horario ??
            ''
        ).trim();

        const timeMatch = rawValue.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
            return (Number(timeMatch[1]) * 60) + Number(timeMatch[2]);
        }

        const parsedDate = new Date(rawValue);
        if (!Number.isNaN(parsedDate.getTime())) {
            return (parsedDate.getHours() * 60) + parsedDate.getMinutes();
        }

        return Number(showtime?.id_funcion) || 0;
    };

    const openSeatSelector = async (cinema, showtime) => {
        setSelectedShow({
            cinema,
            ...showtime,
            selectedShowtimeDateKey,
        });
        setSelectedSeats([]);
        setSeatMap([]);
        setSeatMapError('');
        loadedSeatMapFunctionIdRef.current = null;

        if (!showtime?.id_funcion) {
            return;
        }

        try {
            setSeatMapLoading(true);
            const [seatResult, roomResult] = await Promise.allSettled([
                getSeatMap(showtime.id_funcion),
                showtime.id_sala ? getRoomById(showtime.id_sala) : Promise.resolve(null),
            ]);

            if (seatResult.status === 'rejected') {
                throw seatResult.reason;
            }

            const nextSeats = Array.isArray(seatResult.value?.asientos) ? seatResult.value.asientos : [];
            setSeatMap(nextSeats);
            setSelectedSeats((current) => keepAvailableSelectedSeats(current, nextSeats));
            loadedSeatMapFunctionIdRef.current = showtime.id_funcion;

            if (roomResult.status === 'fulfilled' && roomResult.value) {
                const room = roomResult.value;
                setSelectedShow((current) => {
                    if (!current || current.id_funcion !== showtime.id_funcion) return current;

                    return {
                        ...current,
                        room,
                        nombre_sala: room.nombre,
                        tipo_sala: room.tipoSala,
                        tipo_formato: room.tipoFormato,
                    };
                });
            }
        } catch (err) {
            console.error('Error cargando mapa de asientos:', err);
            setSeatMapError('No se pudo cargar el mapa de asientos real.');
            setSeatMap([]);
        } finally {
            setSeatMapLoading(false);
        }
    };

    const toggleSeat = (seat) => {
        if (!seat || seat.estado !== 'Disponible') return;
        const seatLimit = Number(systemConfig.limiteAsientosPorTransaccion || 10);

        setSelectedSeats((prev) => {
            if (prev.some((item) => item.id_asiento === seat.id_asiento)) {
                return prev.filter((item) => item.id_asiento !== seat.id_asiento);
            }

            if (prev.length >= seatLimit) {
                setSeatMapError(`Puedes seleccionar como máximo ${seatLimit} asientos por compra.`);
                return prev;
            }

            setSeatMapError('');
            return [...prev, seat];
        });
    };

    const goToDulceria = () => {
        if (getShowtimeDateKey(selectedShow) !== selectedShowtimeDateKey) {
            setSeatMapError('La función seleccionada no corresponde a la fecha activa. Vuelve a elegir el horario.');
            setSelectedShow(null);
            setSelectedSeats([]);
            return;
        }

        navigate('/dulceria', {
            state: {
                movieId: pelicula?.id ?? movieId,
                pelicula: titulo,
                poster,
                sede: selectedShow?.cinema?.nombre_cine || selectedShow?.cinema?.nombre || selectedShow?.sede?.nombre,
                horario: formatShowtimeDateTime(selectedShow, selectedShowtimeDateKey),
                fecha_funcion: selectedShowtimeDateKey,
                sala: selectedShow?.nombre_sala || selectedShow?.sala,
                formato: getShowFormat(selectedShow),
                id_funcion: selectedShow?.id_funcion,
                precio_base: Number(selectedShow?.precio_base || 0),
                asientos: selectedSeats.map((seat) => `${seat.fila}${getSeatNumber(seat)}`),
                seatIds: selectedSeats.map((seat) => seat.id_asiento),
                asientosSeleccionados: selectedSeats,
                returnToSeatSelection: {
                    movieId: pelicula?.id ?? movieId,
                    movieState: pelicula,
                    selectedShow,
                    selectedSeats,
                    selectedDateKey: selectedShowtimeDateKey,
                    selectedDateLabel: selectedShowtimeDateLabel,
                },
            },
        });
    };

    const selectedSeatLabels = selectedSeats.map((seat) => `${seat.fila}${getSeatNumber(seat)}`);
    const selectedSeatPrice = Number(selectedShow?.precio_base || 0);
    const selectedSeatsTotal = selectedSeats.length * selectedSeatPrice;

    const seatMapByRow = seatMap.reduce((acc, seat) => {
        if (!acc[seat.fila]) {
            acc[seat.fila] = [];
        }

        acc[seat.fila].push(seat);
        return acc;
    }, {});
    const backendSeatRows = Object.entries(seatMapByRow).sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true }));
    const maxSeatsInRow = Math.max(1, ...backendSeatRows.map(([, seats]) => seats.length));
    const seatGap = maxSeatsInRow > 20 ? 1 : maxSeatsInRow > 14 ? 2 : seatGridWidth < 520 ? 3 : 6;
    const seatLabelWidth = seatGridWidth < 520 ? 22 : 30;
    const availableSeatWidth = Math.max(0, seatGridWidth - seatLabelWidth - (seatGap * (maxSeatsInRow - 1)) - 12);
    const responsiveSeatSize = Math.max(7, Math.min(50, Math.floor(availableSeatWidth / maxSeatsInRow) || 28));

    const renderSeat = (seat, seatSize = 36) => {
        const seatNumber = getSeatNumber(seat);
        const seatKey = seat.id_asiento ?? `${seat.fila}${seatNumber}`;
        const unavailable = seat.estado && seat.estado !== 'Disponible';
        const selected = !unavailable && selectedSeats.some((s) => s.id_asiento === seat.id_asiento);

        return (
            <button
                key={seatKey}
                type="button"
                disabled={unavailable}
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => toggleSeat(seat)}
                aria-pressed={selected}
                aria-label={`Asiento ${seat.fila}${seatNumber}, ${seat.estado ?? 'Disponible'}`}
                title={`${seat.fila}${seatNumber} - ${seat.estado ?? 'Disponible'}`}
                className={[
                    'flex min-w-0 items-center justify-center bg-transparent border-none p-0',
                    'transition-transform duration-100 focus-visible:outline focus-visible:outline-2',
                    'focus-visible:outline-offset-2 focus-visible:outline-teal-500 focus-visible:rounded',
                    !unavailable && 'cursor-pointer hover:-translate-y-0.5 active:scale-95',
                    unavailable && 'cursor-not-allowed opacity-55',
                ].filter(Boolean).join(' ')}
            >
                {/*
                  Vista cenital — pantalla arriba del mapa.
                  Cojín (grande) arriba → cara a la pantalla.
                  Respaldo (franja delgada) abajo → espalda del espectador.
                  Apoyabrazos a los lados del cojín.
                */}
                <SeatGlyph seatSize={seatSize} seatNumber={seat.numero} selected={selected} unavailable={unavailable} />
            </button>
        );
    };

    const renderSeatConfirmationModal = () => {
        if (!showSeatConfirm) return null;

        return (
            <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
                <div className="w-full max-w-[95vw] overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl sm:max-w-md">
                    <div className="flex items-center gap-4 border-b border-slate-700 px-4 py-4 sm:px-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white sm:text-xl">Confirmar asientos</h2>
                            <p className="text-sm text-slate-400">Revisa tus asientos y el total antes de continuar.</p>
                        </div>
                    </div>

                    <div className="px-4 py-5 sm:px-6">
                        <p className="text-sm text-slate-300">
                            ¿Estás seguro de continuar con estos asientos?
                        </p>

                        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800 p-4">
                            <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
                                <span>Asientos</span>
                                <span className="font-semibold text-white text-right">
                                    {selectedSeatLabels.length ? selectedSeatLabels.join(', ') : 'Sin asientos'}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                                <span>Cantidad</span>
                                <span className="font-semibold text-white">{selectedSeatLabels.length}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-slate-700 pt-3 text-base font-bold text-white">
                                <span>Total a cobrar</span>
                                <span>S/. {selectedSeatsTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowSeatConfirm(false)}
                                className="flex-1 rounded-lg bg-slate-700 py-2 font-semibold text-white transition-colors hover:bg-slate-600"
                            >
                                Revisar
                            </button>
                            <button
                                onClick={() => {
                                    setShowSeatConfirm(false);
                                    goToDulceria();
                                }}
                                className="flex-1 rounded-lg bg-emerald-600 py-2 font-semibold text-white transition-colors hover:bg-emerald-700"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderSeatSelector = () => {
        if (!selectedShow) return null;

        return (
            <div className="fixed inset-0 z-[60] bg-[#020b16] text-white">
                <div className="flex h-full flex-col">
                    <div className="border-b border-sky-200/60 px-3 py-3 sm:px-6 lg:px-8">
                        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)_minmax(4.5rem,auto)] items-center gap-2 sm:gap-4">
                            <button
                                onClick={() => setSelectedShow(null)}
                                className="inline-flex min-w-0 items-center gap-2 rounded-full bg-[#8c2730] px-3 py-2 text-[0.7rem] font-medium text-white transition-colors hover:bg-[#a12f39] sm:gap-3 sm:px-5 sm:py-3 sm:text-xl"
                            >
                                <ArrowLeft className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                                Volver
                            </button>

                            <h2 className="min-w-0 px-1 text-center text-[clamp(0.85rem,3.2vw,2.2rem)] font-black uppercase leading-tight tracking-tight text-white break-words sm:text-[clamp(1rem,2.8vw,2.8rem)]">
                                Seleccionar Asientos
                            </h2>

                            <button
                                onClick={() => setShowSeatConfirm(true)}
                                disabled={selectedSeats.length === 0}
                                className="inline-flex min-w-0 items-center gap-2 rounded-full bg-[#2e8b0f] px-3 py-2 text-[0.7rem] font-medium text-white transition-colors hover:bg-[#369f12] disabled:cursor-not-allowed disabled:bg-slate-700 sm:gap-3 sm:px-5 sm:py-3 sm:text-xl"
                            >
                                Siguiente
                                <ArrowRight className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
                        <div className="mx-auto w-full max-w-7xl pb-8">
                            <div className="grid gap-4 lg:grid-cols-[340px_1fr] lg:gap-6 lg:items-start">
                            <aside className="max-h-[calc(100vh-10rem)] overflow-y-auto rounded-[1.5rem] border border-slate-700/60 bg-[#061321] p-3 shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-5 lg:sticky lg:top-4">
                                <div className="overflow-hidden rounded-[1.5rem] border-4 border-[#0e1c2c] sm:rounded-[2rem]">
                                    <img
                                        src={poster}
                                        alt={titulo}
                                        className="h-[160px] w-full object-cover sm:h-[300px] lg:h-[420px]"
                                    />
                                </div>

                                <h3 className="mx-auto mt-3 w-full max-w-none px-2 text-center text-[clamp(1rem,4.5vw,2rem)] font-black uppercase leading-[0.98] tracking-tight text-transparent whitespace-normal break-normal [overflow-wrap:normal] [word-break:normal] [hyphens:none] [text-wrap:balance] [text-shadow:2px_2px_0_#ff2b50] sm:mt-5 sm:text-[clamp(1.2rem,2.7vw,2.4rem)] lg:text-[clamp(1.15rem,1.8vw,2.35rem)]">
                                    {titulo}
                                </h3>

                                <p className="mt-2 text-center text-sm font-bold text-[#5fa6ff] sm:mt-6 sm:text-2xl">
                                    {getShowFormat(selectedShow)}
                                    {selectedShow.idioma ? `, ${selectedShow.idioma}` : ''}
                                </p>

                                <div className="mt-3 space-y-3 sm:mt-6 sm:space-y-5">
                                    <div>
                                        <p className="text-lg font-extrabold text-white sm:text-2xl">
                                            {selectedShow.cinema?.nombre_cine || selectedShow.cinema?.nombre || selectedShow.sede?.nombre || 'Sede por definir'}
                                        </p>
                                        <p className="mt-1 text-base font-semibold text-[#5fa6ff] sm:text-2xl">
                                            {formatShowtimeDateTime(selectedShow, selectedShow?.selectedShowtimeDateKey || selectedShowtimeDateKey)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 text-[#5fa6ff]">
                                        <Clock3 className="h-6 w-6 sm:h-8 sm:w-8" />
                                        <p className="text-lg font-bold sm:text-2xl">
                                            {formatShowtimeTime(selectedShow)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 text-[#5fa6ff]">
                                        <Clapperboard className="h-6 w-6 sm:h-8 sm:w-8" />
                                        <p className="text-lg font-bold sm:text-2xl">{selectedShow.nombre_sala || selectedShow.sala || 'Sala por definir'}</p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border-t border-slate-700 pt-4 sm:mt-8 sm:pt-6">
                                    <div className="grid grid-cols-1 gap-2 text-sm font-bold sm:gap-3 sm:text-lg">
                                        <div className="flex items-center gap-4">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white bg-white text-slate-950 sm:h-10 sm:w-10">
                                                <SeatGlyph seatSize={20} showNumber={false} />
                                            </span>
                                            <span>Disponible</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400 bg-emerald-400 text-slate-950 sm:h-10 sm:w-10">
                                                <SeatGlyph seatSize={20} selected showNumber={false} />
                                            </span>
                                            <span>Seleccionado</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-700 text-slate-300 sm:h-10 sm:w-10">
                                                <SeatGlyph seatSize={20} unavailable showNumber={false} />
                                            </span>
                                            <span>Ocupado</span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowSeatHelp(true)}
                                        className="mt-4 w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 sm:mt-6 sm:px-5 sm:py-3 sm:text-xl"
                                    >
                                        ? Ayuda
                                    </button>
                                </div>
                            </aside>

                            <section ref={seatGridRef} className="overflow-hidden rounded-[1.5rem] border border-slate-700/60 bg-[#061321] p-3 shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-6">
                                <div className="mb-4 text-center sm:mb-5">
                                    <div className="mx-auto h-6 w-full rounded-full bg-sky-200/90 text-center text-[0.75rem] font-black uppercase tracking-[0.22em] text-slate-600 sm:h-8 sm:text-2xl sm:tracking-[0.7em]">
                                        Pantalla
                                    </div>
                                </div>

                                {seatMapLoading ? (
                                    <div className="py-20 text-center text-slate-300">Cargando mapa real de asientos...</div>
                                ) : seatMapError ? (
                                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-100">
                                        {seatMapError}
                                    </div>
                                ) : selectedShow?.id_funcion && seatMap.length > 0 ? (
                                    <div className="space-y-4 sm:space-y-5">
                                        <div className="mb-3 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-200">
                                            <span className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1">
                                                Sala #{selectedShow.id_sala}
                                            </span>
                                            <span className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1">
                                                Asientos: {seatMap.length}
                                            </span>
                                            <span className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1">
                                                Seleccionados: {selectedSeats.length}
                                            </span>
                                        </div>
                                        {backendSeatRows.map(([row, seats]) => {
                                            const sortedSeats = seats
                                                .slice()
                                                .sort((a, b) => Number(getSeatNumber(a)) - Number(getSeatNumber(b)));

                                            return (
                                            <div
                                                key={row}
                                                className="grid min-w-0 items-center"
                                                style={{
                                                    gridTemplateColumns: `${seatLabelWidth}px minmax(0, 1fr)`,
                                                    columnGap: `${seatGap}px`,
                                                }}
                                            >
                                                <div className="relative z-10 text-center text-[0.65rem] font-black uppercase text-[#7fb0ff] sm:text-lg">
                                                    {row}
                                                </div>

                                                <div
                                                    className="grid min-w-0 items-center"
                                                    style={{
                                                        gridTemplateColumns: `repeat(${sortedSeats.length}, minmax(0, 1fr))`,
                                                        columnGap: `${seatGap}px`,
                                                    }}
                                                >
                                                    {sortedSeats.map((seat) => renderSeat(seat, responsiveSeatSize))}
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                ) : selectedShow?.id_funcion ? (
                                    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-8 text-center text-slate-200">
                                        No hay asientos disponibles para esta función.
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-8 text-center text-slate-200">
                                        Selecciona una función para ver los asientos disponibles.
                                    </div>
                                )}

                            </section>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderTrailerPanel = () => (
        <div className="overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
            <div className="relative">
                {showTrailer && videoId ? (
                    <>
                        <iframe
                            key={`trailer-${videoId}`}
                            className="h-[280px] w-full sm:h-[400px]"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`}
                            title={`Tráiler de ${titulo}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                        <button
                            type="button"
                            onClick={() => setShowTrailer(false)}
                            className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/90 sm:right-4 sm:top-4 sm:px-4 sm:text-sm"
                        >
                            Cerrar tráiler
                        </button>
                        {trailerUrl && (
                            <a
                                href={trailerUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80 sm:bottom-4 sm:left-4 sm:px-4 sm:text-sm"
                            >
                                Abrir en YouTube
                            </a>
                        )}
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => videoId && setShowTrailer(true)}
                        className="group relative block w-full"
                    >
                        <img
                            src={trailerPreview}
                            alt="Vista previa del tráiler"
                            className="h-[280px] w-full object-cover sm:h-[400px]"
                            onError={handleImageFallback}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white transition-transform group-hover:scale-110 sm:h-20 sm:w-20">
                                    <Play className="ml-1 h-8 w-8 fill-white text-white sm:h-10 sm:w-10" />
                                </div>
                                <h3 className="text-xl font-bold text-white sm:text-2xl">{textoTrailer}</h3>
                            </div>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            <Header />

            {/* BOTÓN VOLVER*/}
            <div className="fixed right-4 top-24 z-40 sm:right-8">
                <button
                    onClick={() => navigate('/menuPrincipal')}
                    className="rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-950/40 transition-all duration-300 hover:scale-105 hover:bg-red-600 sm:px-6"
                >
                    Volver a Cartelera
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
                {movieError && (
                    <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100">
                        {movieError}
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Columna Izquierda */}
                    <div className="lg:col-span-1 space-y-6 order-1">
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50">
                            <img src={poster} alt={titulo} className="w-full h-[600px] object-cover" onError={handleImageFallback} />
                            <div className="p-6 text-center">
                                <h2 className="mb-2 px-1 text-center text-[clamp(1.2rem,4.5vw,2.2rem)] font-bold leading-tight text-white whitespace-normal break-normal [overflow-wrap:normal] [word-break:normal] [hyphens:none] [text-wrap:balance] sm:text-[clamp(1.5rem,2.8vw,2.6rem)] lg:text-[clamp(1.35rem,1.55vw,2.6rem)]">
                                    {titulo}
                                </h2>
                                <div className="mb-4 flex flex-wrap justify-center gap-2">
                                    {generoChips.map((item) => (
                                        <span
                                            key={item}
                                            className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-100"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                                {renderStars(rating, true)}
                            </div>
                        </div>

                        {/* Reseñas desktop */}
                        <div className="space-y-4 hidden lg:block">
                            <h3 className="text-xl font-bold text-white">Reseñas de la comunidad</h3>
                            {reviewsLoading ? (
                                Array.from({ length: 2 }).map((_, index) => (
                                    <div key={index} className="h-36 animate-pulse rounded-3xl border border-slate-700/50 bg-slate-800/30" />
                                ))
                            ) : reviewsError ? (
                                <div className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100">
                                    {reviewsError}
                                </div>
                            ) : reviews.length > 0 ? (
                                reviews.slice(0, 3).map((review) => (
                                    <ReviewCard key={review.id} review={review} />
                                ))
                            ) : (
                                <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 p-5 text-sm text-slate-300">
                                    Todavía no hay reseñas para esta película.
                                </div>
                            )}
                        </div>

                        {reviews.length > 3 && (
                            <button
                                onClick={() => setShowAllReviews(true)}
                                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-full transition-all duration-300 shadow-lg hover:scale-105 text-xl hidden lg:block"
                            >
                                Leer más reseñas
                            </button>
                        )}
                    </div>

                    {/* Columna Derecha */}
                    <div className="order-2 flex flex-col gap-6 lg:col-span-2">

                        <div className="order-2 lg:order-1">
                            {renderTrailerPanel()}
                        </div>

                        {/* Horarios */}
                        <div className="order-1 space-y-4 lg:order-2">
                            {showtimesLoading ? (
                                <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 p-6 text-slate-300">
                                    Cargando horarios reales...
                                </div>
                            ) : showtimesError && showtimeCatalog.length === 0 ? (
                                <div className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-6 text-amber-100">
                                    {showtimesError}
                                </div>
                            ) : showtimeCatalog.length > 0 ? (
                                showtimeCatalog.map(({ cinema, funciones }) => {
                                    const funcionesOrdenadas = [...funciones].sort((a, b) => {
                                        const timeA = getShowtimeSortValue(a);
                                        const timeB = getShowtimeSortValue(b);

                                        if (timeA !== timeB) {
                                            return timeA - timeB;
                                        }

                                        return (Number(a.id_funcion) || 0) - (Number(b.id_funcion) || 0);
                                    });

                                    return (
                                    <div key={cinema.id} className="bg-gradient-to-r from-slate-700/30 to-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
                                        <h3 className="text-white text-xl font-bold mb-2">{cinema.nombre}</h3>
                                        <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2">
                                            {funcionesOrdenadas.map((funcion) => (
                                                <button
                                                    key={funcion.id_funcion}
                                                    onClick={() => openSeatSelector(cinema, funcion)}
                                                    className="min-w-[120px] shrink-0 rounded-2xl border border-red-400/40 bg-red-500 px-4 py-3 text-left text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-red-600"
                                                >
                                                    <div className="text-lg font-bold">
                                                        {formatShowtimeTime(funcion)}
                                                    </div>
                                                    <div className="mt-1 text-[0.7rem] uppercase tracking-[0.2em] text-red-100/90">
                                                        {funcion.precio_base ? `S/. ${Number(funcion.precio_base).toFixed(2)}` : 'Precio por definir'}
                                                    </div>
                                                    <div className="mt-1 text-xs text-red-50">
                                                        {funcion.nombre_sala || funcion.sala || 'Sala por definir'}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 p-6 text-slate-200">
                                    No hay funciones disponibles para esta película en la fecha seleccionada.
                                </div>
                            )}
                        </div>

                        {/* Sinopsis */}
                        <div className="order-3 bg-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
                            <h3 className="text-white text-2xl font-bold mb-4">Sinopsis</h3>
                            <p className="text-gray-300">{sinopsis}</p>
                        </div>

                        {/* Director */}
                        <div className="order-3 bg-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
                            <h3 className="text-white text-2xl font-bold mb-4">Director</h3>
                            <div className="flex flex-wrap gap-2">
                                {directores.length ? directores.map((item) => (
                                    <span
                                        key={item}
                                        className={chipStyle}
                                    >
                                        {item}
                                    </span>
                                )) : (
                                    <span className={chipStyle}>
                                        {director}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Reparto */}
                        <div className="order-3 bg-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
                            <h3 className="text-white text-2xl font-bold mb-4">Reparto</h3>
                            <div className="flex flex-wrap gap-2">
                                {repartoLista.map((item) => (
                                    <span
                                        key={item}
                                        className="rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1 text-sm text-gray-200"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Reseñas móvil */}
                        <div className="order-3 space-y-4 lg:hidden">
                            <h3 className="text-xl font-bold text-white">Reseñas de la comunidad</h3>
                            {reviewsLoading ? (
                                Array.from({ length: 2 }).map((_, index) => (
                                    <div key={index} className="h-36 animate-pulse rounded-3xl border border-slate-700/50 bg-slate-800/30" />
                                ))
                            ) : reviewsError ? (
                                <div className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100">
                                    {reviewsError}
                                </div>
                            ) : reviews.length > 0 ? (
                                reviews.slice(0, 3).map((review) => (
                                    <ReviewCard key={review.id} review={review} />
                                ))
                            ) : (
                                <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 p-5 text-sm text-slate-300">
                                    Todavía no hay reseñas para esta película.
                                </div>
                            )}
                        </div>

                        {reviews.length > 3 && (
                            <button
                                onClick={() => setShowAllReviews(true)}
                                className="order-3 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-full transition-all duration-300 shadow-lg hover:scale-105 text-xl lg:hidden"
                            >
                                Leer más reseñas
                            </button>
                        )}
                    </div>
                </div>

                {showSeatHelp && (
                    <div
                        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setShowSeatHelp(false)}
                    >
                        <div
                            className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4 sm:px-6">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Ayuda</p>
                                    <h3 className="text-2xl font-bold text-white">Cómo elegir tus asientos</h3>
                                </div>
                                <button
                                    onClick={() => setShowSeatHelp(false)}
                                    className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-5 px-5 py-5 text-sm text-slate-200 sm:px-6">
                                <p>
                                    Elige una función primero y luego selecciona tus asientos desde el mapa.
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                                            <SeatGlyph seatSize={24} showNumber={false} />
                                        </span>
                                        <span>Disponible: lo puedes seleccionar.</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#1D9E75] shadow-sm">
                                            <SeatGlyph seatSize={24} selected showNumber={false} />
                                        </span>
                                        <span>Seleccionado: ya lo elegiste para tu compra.</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-500 shadow-sm">
                                            <SeatGlyph seatSize={24} unavailable showNumber={false} />
                                        </span>
                                        <span>Ocupado: ya no está disponible.</span>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
                                    <h4 className="mb-2 text-base font-semibold text-white">Pasos rápidos</h4>
                                    <ol className="space-y-2 list-decimal pl-5 text-slate-300">
                                        <li>Selecciona una función de la película.</li>
                                        <li>Escoge los asientos disponibles en el mapa.</li>
                                        <li>Presiona Siguiente para continuar a dulcería.</li>
                                        <li>Si no quieres snacks, usa la opción Omitir snacks.</li>
                                    </ol>
                                </div>

                                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
                                    Si no aparece el mapa de asientos, esa función no tiene butacas disponibles.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Reseñas */}
                {showAllReviews && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                         onClick={() => setShowAllReviews(false)}
                    >
                        <div
                            className="bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-scaleIn"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">Todas las Reseñas</h2>
                                <button
                                    onClick={() => setShowAllReviews(false)}
                                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-full"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-6 space-y-4 flex-1">
                                {reviews.map((review) => (
                                    <ReviewCard key={review.id} review={review} modal />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {renderSeatConfirmationModal()}

            {selectedShow && renderSeatSelector()}

            <Footer />

            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

export default DetallePelicula;

