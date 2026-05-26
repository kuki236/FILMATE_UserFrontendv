import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Armchair, Star, Play, X } from 'lucide-react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getCinemas, getMovieById, getSeatMap, getShowtimesByCinema } from './filmateApi';

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
    const [movieDetails, setMovieDetails] = useState(null);
    const [movieLoading, setMovieLoading] = useState(Boolean(movieId));
    const [movieError, setMovieError] = useState('');
    const location = useLocation();
    const navigate = useNavigate();

    const pelicula = movieDetails || location.state;

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
                                ? response.funciones.filter((funcion) => funcion.id_pelicula === pelicula.id)
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

    const sedes = [
        { id: 1, nombre: "Sede Lima Centro", horarios: ["11:30", "13:45", "16:00", "19:30"] },
        { id: 2, nombre: "Sede La Molina", horarios: ["13:00", "18:45", "20:00"] },
        { id: 3, nombre: "Sede Mall del Sur", horarios: ["20:30", "23:00"] }
    ];

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

    const poster = pelicula.imagenPoster || pelicula.imagen;
    const trailerImg = pelicula.imagenTrailer || pelicula.imagenPoster || pelicula.imagen;
    const titulo = pelicula.titulo || 'Película';
    const generos = Array.isArray(pelicula.generos) && pelicula.generos.length
        ? pelicula.generos
        : pelicula.genero
            ? String(pelicula.genero).split(',').map((item) => item.trim()).filter(Boolean)
            : [];
    const genero = generos.length ? generos.join(', ') : 'GÃ©nero no disponible';
    const duracion = pelicula.duracion || '';
    const clasificacion = pelicula.clasificacion || '';
    const rating = pelicula.rating || 0;
    const sinopsis = pelicula.sinopsis || 'Sinopsis próxima a actualizar.';
    const director = pelicula.director || 'Por definir';
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

    const openSeatSelector = async (cinema, showtime) => {
        setSelectedShow({
            cinema,
            ...showtime,
        });
        setSelectedSeats([]);
        setSeatMap([]);
        setSeatMapError('');

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
            },
        });
    };

    const seatMapByRow = seatMap.reduce((acc, seat) => {
        if (!acc[seat.fila]) {
            acc[seat.fila] = [];
        }

        acc[seat.fila].push(seat);
        return acc;
    }, {});
    const backendSeatRows = Object.entries(seatMapByRow).sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true }));

    const renderSeat = (seat) => {
        const seatKey = seat.id_asiento ?? `${seat.fila}${seat.numero}`;
        const selected = selectedSeats.some((item) => item.id_asiento === seat.id_asiento);
        const unavailable = seat.estado && seat.estado !== 'Disponible';

        return (
            <button
                key={seatKey}
                type="button"
                disabled={unavailable}
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => toggleSeat(seat)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-[0.6rem] font-bold transition-all sm:h-9 sm:w-9 sm:text-xs lg:h-10 lg:w-10 ${
                    selected
                        ? 'border-emerald-400 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/30'
                        : unavailable
                            ? 'cursor-not-allowed border-slate-700 bg-slate-700 text-slate-400 opacity-70'
                        : 'border-slate-400 bg-white text-slate-900 hover:-translate-y-0.5 hover:scale-105'
                }`}
                title={`${seat.fila}${seat.numero} - ${seat.estado || 'Disponible'}`}
            >
                {seat.fila}
                {seat.numero}
            </button>
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
                                onClick={goToDulceria}
                                disabled={selectedSeats.length === 0}
                                className="inline-flex min-w-0 items-center gap-2 rounded-full bg-[#2e8b0f] px-3 py-2 text-[0.7rem] font-medium text-white transition-colors hover:bg-[#369f12] disabled:cursor-not-allowed disabled:bg-slate-700 sm:gap-3 sm:px-5 sm:py-3 sm:text-xl"
                            >
                                Siguiente
                                <ArrowRight className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
                        <div
                            className="mx-auto w-full max-w-7xl origin-top pb-8"
                            style={{
                                transform: 'scale(clamp(0.72, calc((100vw - 320px) / 880), 1))',
                            }}
                        >
                            <div className="grid gap-4 lg:grid-cols-[340px_1fr] lg:gap-6">
                            <aside className="rounded-[1.5rem] border border-slate-700/60 bg-[#061321] p-3 shadow-2xl shadow-black/30 sm:rounded-[2rem] sm:p-5">
                                <div className="overflow-hidden rounded-[1.5rem] border-4 border-[#0e1c2c] sm:rounded-[2rem]">
                                    <img
                                        src={poster}
                                        alt={titulo}
                                        className="h-[160px] w-full object-cover sm:h-[300px] lg:h-[420px]"
                                    />
                                </div>

                                <h3 className="mx-auto mt-3 max-w-[14ch] px-2 text-center text-[clamp(1.2rem,3.2vw,2rem)] font-black uppercase leading-[0.98] tracking-tight text-transparent break-words [text-shadow:2px_2px_0_#ff2b50] sm:mt-5 sm:text-[clamp(1.4rem,2.6vw,2.6rem)]">
                                    {titulo}
                                </h3>

                                <p className="mt-2 text-center text-sm font-bold text-[#5fa6ff] sm:mt-6 sm:text-2xl">
                                    2D, Regular, Doblada
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
                                        <span className="text-2xl sm:text-3xl">🕒</span>
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
                                        <span className="text-2xl sm:text-3xl">🎬</span>
                                        <p className="text-lg font-bold sm:text-2xl">{selectedShow.nombre_sala || selectedShow.sala || 'Sala por definir'}</p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border-t border-slate-700 pt-4 sm:mt-8 sm:pt-6">
                                    <div className="grid grid-cols-1 gap-2 text-sm font-bold sm:gap-3 sm:text-lg">
                                        <div className="flex items-center gap-4">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white bg-white text-slate-950 sm:h-10 sm:w-10">
                                                <Armchair className="h-4 w-4 sm:h-6 sm:w-6" />
                                            </span>
                                            <span>Disponible</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400 bg-emerald-400 text-slate-950 sm:h-10 sm:w-10">
                                                <Armchair className="h-4 w-4 sm:h-6 sm:w-6" />
                                            </span>
                                            <span>Seleccionado</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-700 text-slate-300 sm:h-10 sm:w-10">
                                                <Armchair className="h-4 w-4 sm:h-6 sm:w-6" />
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
                                        {backendSeatRows.map(([row, seats]) => (
                                            <div key={row} className="grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-2 sm:grid-cols-[32px_minmax(0,1fr)_32px]">
                                                <div className="text-center text-[0.7rem] font-black text-[#7fb0ff] sm:text-2xl">
                                                    {row}
                                                </div>

                                                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                                                    {seats
                                                        .slice()
                                                        .sort((a, b) => a.numero - b.numero)
                                                        .map((seat) => renderSeat(seat))}
                                                </div>

                                                <div className="text-center text-[0.7rem] font-black text-[#7fb0ff] sm:text-2xl">
                                                    {row}
                                                </div>
                                            </div>
                                        ))}
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
                            <img src={poster} alt={titulo} className="w-full h-[600px] object-cover" />
                            <div className="p-6 text-center">
                                <h2 className="text-2xl font-bold text-white mb-2">{titulo}</h2>
                                <p className="text-gray-300 mb-4">
                                    {genero}{duracion && `, ${duracion}`}{clasificacion && `, ${clasificacion}`}
                                </p>
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
                            <div className="relative group cursor-pointer" onClick={() => videoId && setShowTrailer(true)}>
                                <img src={trailerPreview} alt="Vista previa del tráiler" className="w-full h-[400px] object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                                            <Play className="w-10 h-10 text-white fill-white ml-1" />
                                        </div>
                                        <h3 className="text-white text-2xl font-bold">{textoTrailer}</h3>
                                    </div>
                                </div>
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
                                showtimeCatalog.map(({ cinema, funciones }) => (
                                    <div key={cinema.id} className="bg-gradient-to-r from-slate-700/30 to-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
                                        <h3 className="text-white text-xl font-bold mb-2">{cinema.nombre}</h3>
                                        <p className="mb-4 text-sm text-slate-300">{cinema.ciudad || 'Ciudad no disponible'}</p>
                                        <div className="flex flex-wrap gap-3">
                                            {funciones.map((funcion) => (
                                                <button
                                                    key={funcion.id_funcion}
                                                    onClick={() => openSeatSelector(cinema, funcion)}
                                                    className="min-w-[120px] rounded-2xl border border-red-400/40 bg-red-500 px-4 py-3 text-left text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-red-600"
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
                                ))
                            ) : (
                                sedes.map((sede) => (
                                    <div key={sede.id} className="bg-gradient-to-r from-slate-700/30 to-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
                                        <h3 className="text-white text-xl font-bold mb-4">{sede.nombre}</h3>
                                        <div className="flex flex-wrap gap-3">
                                            {sede.horarios.map((horario, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => openSeatSelector({ id: sede.id, nombre_cine: sede.nombre }, { horario, nombre_sala: `SALA ${9 + sede.id}` })}
                                                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:scale-105"
                                                >
                                                    {horario}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Trailer móvil */}
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 lg:hidden">
                            <div className="relative group cursor-pointer" onClick={() => videoId && setShowTrailer(true)}>
                                <img src={trailerPreview} alt="Vista previa del tráiler" className="w-full h-[400px] object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                                            <Play className="w-10 h-10 text-white fill-white ml-1" />
                                        </div>
                                        <h3 className="text-white text-2xl font-bold">{textoTrailer}</h3>
                                    </div>
                                </div>
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
                            <p className="text-gray-300">{director}</p>
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
                {showTrailer && videoId && (
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
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white bg-white text-slate-950">
                                            <Armchair className="h-4 w-4" />
                                        </span>
                                        <span>Disponible: lo puedes seleccionar.</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400 bg-emerald-400 text-slate-950">
                                            <Armchair className="h-4 w-4" />
                                        </span>
                                        <span>Seleccionado: ya lo elegiste para tu compra.</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-700 text-slate-300">
                                            <Armchair className="h-4 w-4" />
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
