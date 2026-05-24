import React, { useState, useEffect } from 'react';
import { Star, Play, X } from 'lucide-react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { useLocation, useNavigate } from 'react-router-dom';

export const DetallePelicula = () => {
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [showTrailer, setShowTrailer] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const pelicula = location.state;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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

    const renderStars = (rating) => (
        <div className="flex gap-1">
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
    const genero = pelicula.genero || 'Género no disponible';
    const duracion = pelicula.duracion || '';
    const clasificacion = pelicula.clasificacion || '';
    const rating = pelicula.rating || 0;
    const sinopsis = pelicula.sinopsis || 'Sinopsis próxima a actualizar.';
    const director = pelicula.director || 'Por definir';
    const reparto = pelicula.reparto || 'Por definir';
    const textoTrailer = pelicula.trailer || 'TRÁILER OFICIAL';
    const trailerUrl = pelicula.trailerUrl || '';

    const getYouTubeVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYouTubeVideoId(trailerUrl);

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
                                {renderStars(rating)}
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
                                <img src={trailerImg} alt="Trailer" className="w-full h-[400px] object-cover" />
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
                            {sedes.map((sede) => (
                                <div key={sede.id} className="bg-gradient-to-r from-slate-700/30 to-slate-800/30 backdrop-blur-sm rounded-3xl p-6 border border-slate-700/50">
                                    <h3 className="text-white text-xl font-bold mb-4">{sede.nombre}</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {sede.horarios.map((horario, index) => (
                                            <button
                                                key={index}
                                                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:scale-105"
                                            >
                                                {horario}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Trailer móvil */}
                        <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl overflow-hidden border border-slate-700/50 lg:hidden">
                            <div className="relative group cursor-pointer" onClick={() => videoId && setShowTrailer(true)}>
                                <img src={trailerImg} alt="Trailer" className="w-full h-[400px] object-cover" />
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
                            <p className="text-gray-300">{reparto}</p>
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

            <Footer />

            <style jsx>{`
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
