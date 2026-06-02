import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Armchair, Clock3, Clapperboard, Star, Play, X } from 'lucide-react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getCinemas, getMovieById, getSeatMap, getShowtimesByCinema } from './filmateApi';

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
    const location = useLocation();
    const navigate = useNavigate();
    const seatMapScrollRef = useRef(null);
    const seatRowScrollRefs = useRef({});
    const seatSizes = useRef({});
    const loadedSeatMapFunctionIdRef = useRef(null);

    const pelicula = movieDetails || location.state?.movieState || location.state;
    const returnSeatSelection =
        location.state?.returnToSeatSelection ||
        (location.state?.selectedShow ? location.state : null);
    const seatPrice = 22.5;

    useEffect(() => {
        window.scrollTo(0, 0);
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

                const cinemas = await getCinemas();
                const catalogs = await Promise.all(
                    cinemas.map(async (cinema) => {
                        try {
                            const response = await getShowtimesByCinema(cinema.id);
                            const funciones = Array.isArray(response?.funciones)
                                ? response.funciones.filter((funcion) => Number(funcion.id_pelicula) === Number(pelicula.id))
                                : [];

                            return {
                                cinema,
                                funciones,
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
    }, [pelicula?.id]);

    useEffect(() => {
        if (!returnSeatSelection) return;

        if (returnSeatSelection.selectedShow) {
            setSelectedShow(returnSeatSelection.selectedShow);
        }

        if (Array.isArray(returnSeatSelection.selectedSeats)) {
            setSelectedSeats(returnSeatSelection.selectedSeats);
        }
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

                setSeatMap(Array.isArray(response?.asientos) ? response.asientos : []);
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
        if (!selectedShow) return;

        const restoreScroll = () => {
            const container = seatMapScrollRef.current;
            if (!container) return;

            const currentTop = seatSizes.current.__scrollTop ?? container.scrollTop;
            container.scrollTop = currentTop;

            const rowScrolls = seatSizes.current.__rowScrolls || {};
            Object.entries(seatRowScrollRefs.current).forEach(([row, node]) => {
                if (!node) return;
                node.scrollLeft = rowScrolls[row] ?? node.scrollLeft;
            });
        };

        const raf = window.requestAnimationFrame(restoreScroll);
        return () => window.cancelAnimationFrame(raf);
    }, [selectedSeats, selectedShow]);

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

    const resenas = [
        {
            id: 1,
            usuario: "Carlos Mendoza",
            rating: 5,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
            texto: "Nunca pensé que saldría del cine con el corazón latiendo a mil por hora..."
        },
        {
            id: 2,
            usuario: "María García",
            rating: 4,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
            texto: "Una versión diferente a lo que esperaba, pero con mucho corazón..."
        },
        {
            id: 3,
            usuario: "Roberto Silva",
            rating: 5,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
            texto: "El desarrollo de los personajes y el ritmo están muy bien logrados..."
        },
        {
            id: 4,
            usuario: "Ana Torres",
            rating: 5,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
            texto: "Captura la esencia del género de forma fresca y emocionante."
        },
        {
            id: 5,
            usuario: "Luis Ramírez",
            rating: 4,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=5",
            texto: "Entretenida, atractiva y con momentos emotivos."
        },
        {
            id: 6,
            usuario: "Patricia Flores",
            rating: 5,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=6",
            texto: "Escenas memorables que se quedan contigo."
        },
        {
            id: 7,
            usuario: "Diego Castro",
            rating: 3,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=7",
            texto: "Buena, aunque algo apresurada en partes."
        }
    ];

    const renderStars = (rating, centered = false) => (
        <div className={`flex gap-1 ${centered ? 'justify-center' : 'justify-start'}`}>
            {[...Array(5)].map((_, index) => (
                <Star
                    key={index}
                    className={`w-4 h-4 ${index < rating ? 'fill-[#FF9500] text-[#FF9500]' : 'fill-gray-400 text-gray-400'}`}
                />
            ))}
        </div>
    );

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

    const poster = pelicula.imagenPoster || pelicula.imagen || FALLBACK_MEDIA_IMAGE;
    const trailerImg = pelicula.imagenTrailer || pelicula.imagenPoster || pelicula.imagen || FALLBACK_MEDIA_IMAGE;
    const titulo = pelicula.titulo || 'Película';
    const generos = Array.isArray(pelicula.generos) && pelicula.generos.length
        ? pelicula.generos
        : pelicula.genero
            ? String(pelicula.genero).split(',').map((item) => item.trim()).filter(Boolean)
            : [];
    const genero = generos.length ? generos.join(', ') : 'Género no disponible';
    const duracion = pelicula.duracion || '';
    const clasificacion = pelicula.clasificacion || '';
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
    const reparto = actores.length ? actores.join(', ') : 'Por definir';
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
            const response = await getSeatMap(showtime.id_funcion);
            setSeatMap(Array.isArray(response?.asientos) ? response.asientos : []);
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

        setSelectedSeats((prev) =>
            prev.some((item) => item.id_asiento === seat.id_asiento)
                ? prev.filter((item) => item.id_asiento !== seat.id_asiento)
                : [...prev, seat]
        );
    };

    const goToDulceria = () => {
        navigate('/dulceria', {
            state: {
                movieId: pelicula?.id ?? movieId,
                pelicula: titulo,
                poster,
                sede: selectedShow?.cinema?.nombre_cine || selectedShow?.cinema?.nombre || selectedShow?.sede?.nombre,
                horario: selectedShow?.fecha_hora_inicio
                    ? new Date(selectedShow.fecha_hora_inicio).toLocaleString('es-PE')
                    : selectedShow?.horario,
                sala: selectedShow?.nombre_sala || selectedShow?.sala,
                id_funcion: selectedShow?.id_funcion,
                asientos: selectedSeats.map((seat) => `${seat.fila}${seat.numero}`),
                seatIds: selectedSeats.map((seat) => seat.id_asiento),
                asientosSeleccionados: selectedSeats,
                returnToSeatSelection: {
                    movieId: pelicula?.id ?? movieId,
                    movieState: pelicula,
                    selectedShow,
                    selectedSeats,
                },
            },
        });
    };

    const selectedSeatLabels = selectedSeats.map((seat) => `${seat.fila}${seat.numero}`);
    const selectedSeatsTotal = selectedSeats.length * seatPrice;

    const seatMapByRow = seatMap.reduce((acc, seat) => {
        if (!acc[seat.fila]) {
            acc[seat.fila] = [];
        }

        acc[seat.fila].push(seat);
        return acc;
    }, {});
    const backendSeatRows = Object.entries(seatMapByRow).sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true }));

    const renderSeat = (seat, seatSize = 36) => {
        const seatKey = seat.id_asiento ?? `${seat.fila}${seat.numero}`;
        const selected = selectedSeats.some((s) => s.id_asiento === seat.id_asiento);
        const unavailable = seat.estado && seat.estado !== 'Disponible';

        return (
            <button
                key={seatKey}
                type="button"
                disabled={unavailable}
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => toggleSeat(seat)}
                aria-pressed={selected}
                aria-label={`Asiento ${seat.fila}${seat.numero}, ${seat.estado ?? 'Disponible'}`}
                title={`${seat.fila}${seat.numero} — ${seat.estado ?? 'Disponible'}`}
                className={[
                    'flex flex-col items-center gap-1 bg-transparent border-none p-0',
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

                <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                    {seat.fila}
                </span>
            </button>
        );
    };

    const SeatConfirmationModal = () => {
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

    const SeatSelector = () => {
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

                    <div
                        ref={seatMapScrollRef}
                        onScroll={(e) => {
                            seatSizes.current.__scrollTop = e.currentTarget.scrollTop;
                        }}
                        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:px-6 sm:py-6 lg:px-8"
                    >
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

                                <h3 className="mx-auto mt-3 w-full max-w-none px-2 text-center text-[clamp(1.15rem,5vw,2rem)] font-black uppercase leading-[0.98] tracking-tight text-transparent break-words whitespace-normal [text-shadow:2px_2px_0_#ff2b50] sm:mt-5 sm:text-[clamp(1.35rem,3vw,2.6rem)] lg:text-[clamp(1.5rem,2vw,2.9rem)]">
                                    {titulo}
                                </h3>

                                <p className="mt-2 text-center text-sm font-bold text-[#5fa6ff] sm:mt-6 sm:text-2xl">
                                    {selectedShow.formato || 'Formato por definir'}
                                    {selectedShow.idioma ? `, ${selectedShow.idioma}` : ''}
                                </p>

                                <div className="mt-3 space-y-3 sm:mt-6 sm:space-y-5">
                                    <div>
                                        <p className="text-lg font-extrabold text-white sm:text-2xl">
                                            {selectedShow.cinema?.nombre_cine || selectedShow.cinema?.nombre || selectedShow.sede?.nombre || 'Sede por definir'}
                                        </p>
                                        <p className="mt-1 text-base font-semibold text-[#5fa6ff] sm:text-2xl">
                                            {selectedShow.fecha_hora_inicio
                                                ? new Date(selectedShow.fecha_hora_inicio).toLocaleString('es-PE')
                                                : selectedShow.horario}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 text-[#5fa6ff]">
                                        <Clock3 className="h-6 w-6 sm:h-8 sm:w-8" />
                                        <p className="text-lg font-bold sm:text-2xl">
                                            {selectedShow.fecha_hora_inicio
                                                ? new Date(selectedShow.fecha_hora_inicio).toLocaleTimeString('es-PE', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })
                                                : selectedShow.horario}
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

                            <section className="overflow-hidden rounded-[1.5rem] border border-slate-700/60 bg-[#061321] p-3 shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-6">
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
                                            const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
                                            const seatSize = Math.max(28, Math.min(56, Math.floor((viewportWidth - 140) / Math.max(seats.length, 1))));

                                            return (
                                            <div key={row} className="grid grid-cols-[1.35rem_minmax(0,1fr)_1.35rem] items-center gap-1 sm:grid-cols-[32px_minmax(0,1fr)_32px] sm:gap-2">
                                                <div className="text-center text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#7fb0ff] sm:text-2xl sm:tracking-[0.35em]">
                                                    {row}
                                                </div>

                                                <div
                                                    ref={(node) => {
                                                        if (node) {
                                                            seatRowScrollRefs.current[row] = node;
                                                        } else {
                                                            delete seatRowScrollRefs.current[row];
                                                        }
                                                    }}
                                                    onScroll={(e) => {
                                                        seatSizes.current.__rowScrolls = seatSizes.current.__rowScrolls || {};
                                                        seatSizes.current.__rowScrolls[row] = e.currentTarget.scrollLeft;
                                                    }}
                                                    className="flex min-w-0 flex-nowrap items-center justify-start gap-1 overflow-x-auto overflow-y-hidden px-1 pb-1 sm:justify-center sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0"
                                                >
                                                    {seats
                                                        .slice()
                                                        .sort((a, b) => a.numero - b.numero)
                                                        .map((seat) => renderSeat(seat, seatSize))}
                                                </div>

                                                <div className="text-center text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#7fb0ff] sm:text-2xl sm:tracking-[0.35em]">
                                                    {row}
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            <Header />

            {/* BOTÓN VOLVER*/}
            <div className="flex justify-end mt-6 px-4 sm:px-6 lg:px-8">
                <button
                    onClick={() => navigate('/menuPrincipal')}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full 
                               transition-all duration-300 shadow-lg hover:scale-105"
                >
                    Volver a Cartelera
                </button>
            </div>

            <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
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
                                <h2 className="mb-2 break-words px-1 text-center text-[clamp(1.4rem,5vw,2.2rem)] font-bold leading-tight text-white sm:text-[clamp(1.7rem,3vw,2.8rem)] lg:text-[clamp(1.8rem,1.7vw,3rem)]">
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
                            {resenas.slice(0, 3).map((resena) => (
                                <div key={resena.id} className="bg-slate-800/30 backdrop-blur-sm rounded-3xl p-5 border border-slate-700/50">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-600 flex-shrink-0">
                                            <img src={resena.avatar} alt={resena.usuario} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm mb-1">{resena.usuario}</p>
                                            {renderStars(resena.rating)}
                                        </div>
                                    </div>
                                    <p className="text-gray-300 text-sm">{resena.texto}</p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowAllReviews(true)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-full transition-all duration-300 shadow-lg hover:scale-105 text-xl hidden lg:block"
                        >
                            Leer más reseñas
                        </button>
                    </div>

                    {/* Columna Derecha */}
                    <div className="lg:col-span-2 space-y-6 order-2">

                        {/* Trailer desktop */}
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 hidden lg:block">
                            <div className="relative">
                                {showTrailer && videoId ? (
                                    <>
                                        <iframe
                                            className="h-[400px] w-full"
                                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                        <button
                                            onClick={() => setShowTrailer(false)}
                                            className="absolute right-4 top-4 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/90"
                                        >
                                            Cerrar tráiler
                                        </button>
                                        {trailerUrl && (
                                            <a
                                                href={trailerUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute bottom-4 left-4 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80"
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
                                            className="h-[400px] w-full object-cover"
                                            onError={handleImageFallback}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <div className="text-center">
                                                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-transform group-hover:scale-110">
                                                    <Play className="ml-1 h-10 w-10 fill-white text-white" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-white">{textoTrailer}</h3>
                                            </div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Horarios */}
                        <div className="space-y-4">
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
                                        <p className="mb-4 text-sm text-slate-300">{cinema.ciudad || 'Ciudad no disponible'}</p>
                                        <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2">
                                            {funcionesOrdenadas.map((funcion) => (
                                                <button
                                                    key={funcion.id_funcion}
                                                    onClick={() => openSeatSelector(cinema, funcion)}
                                                    className="min-w-[120px] shrink-0 rounded-2xl border border-red-400/40 bg-red-500 px-4 py-3 text-left text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-red-600"
                                                >
                                                    <div className="text-lg font-bold">
                                                        {new Date(funcion.fecha_hora_inicio).toLocaleTimeString('es-PE', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </div>
                                                    <div className="mt-1 text-[0.7rem] uppercase tracking-[0.2em] text-red-100/90">
                                                        {funcion.formato || 'Formato por definir'}
                                                    </div>
                                                    <div className="mt-1 text-xs text-red-50">
                                                        {funcion.idioma || 'Idioma por definir'}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 p-6 text-slate-200">
                                    No hay funciones disponibles para esta película por el momento.
                                </div>
                            )}
                        </div>

                        {/* Trailer móvil */}
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 lg:hidden">
                            <div className="relative">
                                {showTrailer && videoId ? (
                                    <>
                                        <iframe
                                            className="h-[400px] w-full"
                                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                        <button
                                            onClick={() => setShowTrailer(false)}
                                            className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/90"
                                        >
                                            Cerrar
                                        </button>
                                        {trailerUrl && (
                                            <a
                                                href={trailerUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                                            >
                                                YouTube
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
                                            className="h-[400px] w-full object-cover"
                                            onError={handleImageFallback}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <div className="text-center">
                                                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white transition-transform group-hover:scale-110">
                                                    <Play className="ml-1 h-10 w-10 fill-white text-white" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-white">{textoTrailer}</h3>
                                            </div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Sinopsis */}
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
                            <h3 className="text-white text-2xl font-bold mb-4">Sinopsis</h3>
                            <p className="text-gray-300">{sinopsis}</p>
                        </div>

                        {/* Director */}
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
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
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
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
                        <div className="space-y-4 lg:hidden">
                            {resenas.slice(0, 3).map((resena) => (
                                <div key={resena.id} className="bg-slate-800/30 backdrop-blur-sm rounded-3xl p-5 border border-slate-700/50">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-600 flex-shrink-0">
                                            <img src={resena.avatar} alt={resena.usuario} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm mb-1">{resena.usuario}</p>
                                            {renderStars(resena.rating)}
                                        </div>
                                    </div>
                                    <p className="text-gray-300 text-sm">{resena.texto}</p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowAllReviews(true)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-full transition-all duration-300 shadow-lg hover:scale-105 text-xl lg:hidden"
                        >
                            Leer más reseñas
                        </button>
                    </div>
                </div>

                {/* Modal Trailer */}
                {false && videoId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
                        onClick={() => setShowTrailer(false)}
                    >
                        <div
                            className="relative w-full max-w-5xl aspect-video animate-scaleIn"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowTrailer(false)}
                                className="absolute -top-12 right-0 text-white hover:text-red-500 transition-colors p-2 hover:bg-white/10 rounded-full z-10"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <iframe
                                className="w-full h-full rounded-2xl shadow-2xl"
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                            {trailerUrl && (
                                <a
                                    href={trailerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute bottom-4 left-4 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                                >
                                    Abrir en YouTube
                                </a>
                            )}
                        </div>
                    </div>
                )}

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
                                {resenas.map((resena) => (
                                    <div key={resena.id} className="bg-slate-700/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50">
                                        <div className="flex items-start gap-4 mb-3">
                                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-500">
                                                <img src={resena.avatar} alt={resena.usuario} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-bold text-lg mb-1">{resena.usuario}</p>
                                {renderStars(resena.rating)}
                                            </div>
                                        </div>
                                        <p className="text-gray-300">{resena.texto}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <SeatConfirmationModal />

            {selectedShow && <SeatSelector />}

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
