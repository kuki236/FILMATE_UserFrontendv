import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { useNavigate } from 'react-router-dom';
import { peliculas } from './peliculas';
import { getMovies } from './filmateApi';

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    const displayPeliculas = peliculasData.length > 0 ? peliculasData : peliculas;

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
                        {loading && displayPeliculas.length === 0 ? (
                            <div className="col-span-full text-gray-300">Cargando películas...</div>
                        ) : (
                            displayPeliculas.slice(0, 3).map((pelicula, i) => (
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

                {/* Cartelera */}
                <section>
                    <h2 className="text-4xl font-bold text-white mb-8">Cartelera</h2>
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
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default MenuPrincipal;
