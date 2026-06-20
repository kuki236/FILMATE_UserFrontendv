import { useEffect, useState } from 'react';
import { ArrowLeft, Film, MessageSquareText, Send, Star } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Header from './Header.jsx';
import StarRatingDisplay from './StarRatingDisplay.jsx';
import { getAuthSession } from './authSession';
import { createMovieReview, getMovieById } from './filmateApi';

const FALLBACK_POSTER = 'https://placehold.co/400x600/0f172a/f8fafc?text=Filmate';

const getUserId = (user) => user?.id_usuario || user?.id || user?.user_id || null;

export const SocialPelicula = () => {
  const { movieId } = useParams();
  const location = useLocation();
  const [session] = useState(() => getAuthSession());
  const userId = getUserId(session?.user);
  const [movie, setMovie] = useState(location.state?.movie || null);
  const [loading, setLoading] = useState(!location.state?.movie);
  const [loadError, setLoadError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  useEffect(() => {
    let active = true;

    getMovieById(movieId)
      .then((movieDetails) => {
        if (active) setMovie(movieDetails);
      })
      .catch((error) => {
        if (active) setLoadError(error?.message || 'No se pudo cargar la película.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [movieId]);

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    if (!userId) {
      setReviewError('No se pudo identificar tu sesión. Vuelve a iniciar sesión.');
      return;
    }

    if (!rating) {
      setReviewError('Selecciona una calificación de 1 a 5 estrellas.');
      return;
    }

    if (!comment.trim()) {
      setReviewError('Escribe un comentario para publicar tu reseña.');
      return;
    }

    try {
      setSavingReview(true);
      await createMovieReview({
        id_usuario: userId,
        id_pelicula: Number(movieId),
        puntuacion_estrellas: rating,
        comentario: comment.trim(),
      });

      setMovie((currentMovie) => {
        if (!currentMovie) return currentMovie;

        const previousTotal = Number(currentMovie.totalResenas || 0);
        const previousAverage = Number(currentMovie.rating || 0);
        const nextTotal = previousTotal + 1;

        return {
          ...currentMovie,
          totalResenas: nextTotal,
          rating: Math.round((((previousAverage * previousTotal) + rating) / nextTotal) * 2) / 2,
        };
      });
      setRating(0);
      setHoveredRating(0);
      setComment('');
      setReviewSuccess('Tu reseña se publicó correctamente.');
      setReviewOpen(false);
    } catch (error) {
      setReviewError(error?.message || 'No se pudo publicar la reseña.');
    } finally {
      setSavingReview(false);
    }
  };

  const visibleRating = hoveredRating || rating;

  return (
    <div className="min-h-screen bg-[#020b16] text-white">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/social"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Social
        </Link>

        {loadError && (
          <div className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
            {loadError}
          </div>
        )}

        {reviewSuccess && (
          <div className="mt-6 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
            {reviewSuccess}
          </div>
        )}

        {loading && !movie ? (
          <div className="mt-8 grid animate-pulse gap-8 lg:grid-cols-[280px_1fr]">
            <div className="aspect-[2/3] rounded-xl bg-slate-800" />
            <div className="space-y-5">
              <div className="h-12 w-3/4 rounded bg-slate-800" />
              <div className="h-6 w-1/2 rounded bg-slate-800" />
              <div className="h-40 rounded bg-slate-800" />
            </div>
          </div>
        ) : movie ? (
          <section className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
            <img
              src={movie.imagenPoster || FALLBACK_POSTER}
              alt={movie.titulo}
              className="mx-auto aspect-[2/3] w-full max-w-[280px] rounded-xl border border-slate-700 object-cover shadow-2xl shadow-black/40 lg:mx-0"
              onError={(event) => {
                event.currentTarget.src = FALLBACK_POSTER;
              }}
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-sky-300">Película en Social</p>
                  <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
                    {movie.titulo}
                  </h1>
                  <p className="mt-3 text-base font-semibold text-white/60">
                    {[movie.anio, movie.genero, movie.duracion, movie.clasificacion].filter(Boolean).join(' · ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReviewOpen((current) => !current);
                    setReviewError('');
                    setReviewSuccess('');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-base font-extrabold text-white shadow-lg shadow-red-950/30 transition-colors hover:bg-red-600"
                >
                  <MessageSquareText className="h-5 w-5" />
                  {reviewOpen ? 'Cerrar reseña' : 'Reseñar'}
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                <StarRatingDisplay rating={movie.rating} />
                <span className="font-black text-amber-200">{movie.rating || 0}/5</span>
                <span className="text-sm font-semibold text-white/55">
                  {movie.totalResenas || 0} reseñas
                </span>
              </div>

              {reviewOpen && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="mt-6 rounded-xl border border-sky-300/25 bg-slate-900/70 p-5 shadow-xl shadow-black/20"
                >
                  <h2 className="text-xl font-extrabold text-white">Escribe tu reseña</h2>
                  <p className="mt-1 text-sm font-semibold text-white/55">
                    Califica la película y cuéntale a la comunidad qué te pareció.
                  </p>

                  <div className="mt-5">
                    <span className="text-sm font-bold text-white/75">Calificación</span>
                    <div className="mt-2 flex w-fit gap-2" onMouseLeave={() => setHoveredRating(0)}>
                      {Array.from({ length: 5 }).map((_, index) => {
                        const value = index + 1;
                        const selected = value <= visibleRating;

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRating(value)}
                            onMouseEnter={() => setHoveredRating(value)}
                            className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-300"
                            aria-label={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
                          >
                            <Star className={`h-8 w-8 ${selected ? 'fill-amber-400 text-amber-400' : 'text-white/30'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="mt-5 block">
                    <span className="text-sm font-bold text-white/75">Comentario</span>
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={5}
                      maxLength={1000}
                      className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-400"
                      placeholder="¿Qué destacarías de esta película?"
                    />
                    <span className="mt-1 block text-right text-xs font-semibold text-white/40">
                      {comment.length}/1000
                    </span>
                  </label>

                  {reviewError && (
                    <p className="mt-3 text-sm font-semibold text-red-200">{reviewError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={savingReview}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2a6bb7] px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#2f77c9] disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    <Send className="h-4 w-4" />
                    {savingReview ? 'Publicando...' : 'Publicar reseña'}
                  </button>
                </form>
              )}

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <article className="rounded-xl border border-slate-800 bg-slate-900/55 p-5 md:col-span-2">
                  <h2 className="flex items-center gap-2 text-xl font-extrabold text-white">
                    <Film className="h-5 w-5 text-sky-300" />
                    Sinopsis
                  </h2>
                  <p className="mt-3 text-base font-medium leading-relaxed text-white/70">{movie.sinopsis}</p>
                </article>

                <article className="rounded-xl border border-slate-800 bg-slate-900/55 p-5">
                  <h2 className="text-lg font-extrabold text-white">Dirección</h2>
                  <p className="mt-2 font-semibold text-white/65">{movie.director || 'Por definir'}</p>
                </article>

                <article className="rounded-xl border border-slate-800 bg-slate-900/55 p-5">
                  <h2 className="text-lg font-extrabold text-white">Reparto</h2>
                  <p className="mt-2 font-semibold text-white/65">{movie.reparto || 'Por definir'}</p>
                </article>
              </div>
            </div>
          </section>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
            No se encontró la película solicitada.
          </div>
        )}
      </main>
    </div>
  );
};

export default SocialPelicula;
