import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, Film, Heart, MessageSquareText, Send, Star, ThumbsUp } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Header from './Header.jsx';
import StarRatingDisplay from './StarRatingDisplay.jsx';
import { getAuthSession } from './authSession';
import {
  createReviewComment,
  createMovieReview,
  getMovieById,
  getMovieInteraction,
  getMovies,
  getMovieReviews,
  getReviewComments,
  likeMovieReview,
  updateMovieReview,
  updateMovieInteraction,
} from './filmateApi';

const FALLBACK_POSTER = 'https://placehold.co/400x600/0f172a/f8fafc?text=Filmate';
const FALLBACK_BANNER = 'https://placehold.co/1200x420/020b16/f8fafc?text=Filmate';
const MOVIE_CACHE_PREFIX = 'filmate.social.movie.';
const reviewSkeletonIds = ['review-a', 'review-b', 'review-c'];

const getUserId = (user) => user?.id_usuario || user?.id || user?.user_id || null;

const getMovieCacheKey = (movieId) => `${MOVIE_CACHE_PREFIX}${movieId}`;
const isPlaceholderText = (value) => {
  const text = String(value || '').trim().toLowerCase();
  return (
    !text ||
    text === 'por definir' ||
    text.includes('proxima a actualizar') ||
    text.includes('próxima a actualizar')
  );
};

const hasMovieDetails = (movie) => (
  movie &&
  !isPlaceholderText(movie.sinopsis) &&
  !isPlaceholderText(movie.director) &&
  !isPlaceholderText(movie.reparto)
);

const mergeMovieDetails = (baseMovie, detailsMovie) => {
  if (!baseMovie) return detailsMovie;
  if (!detailsMovie) return baseMovie;

  return {
    ...baseMovie,
    ...detailsMovie,
    totalVistas: detailsMovie.totalVistas ?? baseMovie.totalVistas,
    totalFavoritos: detailsMovie.totalFavoritos ?? baseMovie.totalFavoritos,
    totalResenas: detailsMovie.totalResenas ?? baseMovie.totalResenas,
  };
};

const readCachedMovie = (movieId) => {
  if (!movieId) return null;

  try {
    const rawMovie = globalThis.window.sessionStorage.getItem(getMovieCacheKey(movieId));
    return rawMovie ? JSON.parse(rawMovie) : null;
  } catch {
    return null;
  }
};

const writeCachedMovie = (movieId, movie) => {
  if (!movieId || !movie) return;

  try {
    globalThis.window.sessionStorage.setItem(getMovieCacheKey(movieId), JSON.stringify(movie));
  } catch {
    // Cache opcional para evitar refetch de detalles.
  }
};

export const SocialPelicula = () => {
  const { movieId } = useParams();
  const location = useLocation();
  const [session] = useState(() => getAuthSession());
  const userId = getUserId(session?.user);
  const [movie, setMovie] = useState(() => location.state?.movie || readCachedMovie(movieId));
  const [loading, setLoading] = useState(() => !(location.state?.movie || readCachedMovie(movieId)));
  const [loadError, setLoadError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [interaction, setInteraction] = useState({ vista: false, favorita: false, en_lista_seguimiento: false });
  const [interactionSaving, setInteractionSaving] = useState('');
  const [interactionError, setInteractionError] = useState('');
  const [personalRating, setPersonalRating] = useState(0);
  const [hoveredPersonalRating, setHoveredPersonalRating] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  const [comment, setComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewComments, setReviewComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [commentSavingId, setCommentSavingId] = useState(null);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    let active = true;
    const stateMovie = location.state?.movie;
    const cachedMovie = readCachedMovie(movieId);
    const baseMovie = cachedMovie || stateMovie;

    if (baseMovie && hasMovieDetails(baseMovie)) {
      writeCachedMovie(movieId, baseMovie);
      const cacheTimer = globalThis.window.setTimeout(() => {
        if (!active) return;
        setMovie(baseMovie);
        setLoading(false);
      }, 0);

      return () => {
        active = false;
        globalThis.window.clearTimeout(cacheTimer);
      };
    }

    const loadDetails = async () => {
      const movies = await getMovies({ limit: 200 });
      const catalogMovie = movies.find((item) => String(item.id) === String(movieId));
      if (hasMovieDetails(catalogMovie)) return catalogMovie;
      return getMovieById(movieId);
    };

    loadDetails()
      .then((movieDetails) => {
        if (!active) return;
        const nextMovie = mergeMovieDetails(baseMovie, movieDetails);
        setMovie(nextMovie);
        writeCachedMovie(movieId, nextMovie);
      })
      .catch((error) => {
        if (active) setLoadError(error?.message || 'No se pudo cargar la pelicula.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [location.state, movieId]);

  useEffect(() => {
    let active = true;

    const loadingTimer = globalThis.window.setTimeout(() => {
      if (!active) return;
      setReviewsLoading(true);
      setReviewsError('');
    }, 0);

    getMovieReviews(movieId, userId)
      .then((movieReviews) => {
        if (!active) return;
        setReviews(movieReviews);

        const currentUserReview = movieReviews.find((review) => String(review.userId) === String(userId));
        if (currentUserReview?.rating) {
          setPersonalRating(currentUserReview.rating);
        }
      })
      .catch((error) => {
        if (active) setReviewsError(error?.message || 'No se pudieron cargar las reseñas.');
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
      globalThis.window.clearTimeout(loadingTimer);
    };
  }, [movieId, userId]);

  useEffect(() => {
    if (!userId || !movieId) return undefined;

    let active = true;

    Promise.allSettled([
      getMovieInteraction(userId, movieId),
      getMovieById(movieId),
    ])
      .then(([interactionResult, movieResult]) => {
        if (!active) return;

        const currentInteraction =
          interactionResult.status === 'fulfilled' ? interactionResult.value : null;
        const nextInteraction = {
          vista: Boolean(currentInteraction?.vista),
          favorita: Boolean(currentInteraction?.favorita),
          en_lista_seguimiento: Boolean(currentInteraction?.en_lista_seguimiento),
          fecha_vista: currentInteraction?.fecha_vista || currentInteraction?.fechaVista || null,
          fecha_favorito: currentInteraction?.fecha_favorito || currentInteraction?.fecha_favorita || currentInteraction?.fechaFavorito || null,
        };

        setInteraction(nextInteraction);

        if (movieResult.status === 'fulfilled' && movieResult.value) {
          setMovie((currentMovie) => {
            const nextMovie = mergeMovieDetails(currentMovie, movieResult.value);
            writeCachedMovie(movieId, nextMovie);
            return nextMovie;
          });
        }
      })
      .catch(() => {
        if (active) setInteraction({ vista: false, favorita: false, en_lista_seguimiento: false });
      });

    return () => {
      active = false;
    };
  }, [movieId, userId]);

  const currentUserReview = reviews.find((review) => String(review.userId) === String(userId));
  const hasWrittenReview = Boolean(currentUserReview?.texto?.trim());

  const handleRatingChange = async (value) => {
    setReviewError('');
    setReviewSuccess('');
    setRatingMessage('');

    if (!userId) {
      setRatingMessage('Inicia sesion para calificar.');
      return;
    }

    const previousRating = personalRating;
    setPersonalRating(value);

    try {
      setRatingSaving(true);
      if (currentUserReview?.id) {
        await updateMovieReview(currentUserReview.id, {
          puntuacion_estrellas: value,
          comentario: currentUserReview.texto || '',
        });
      } else {
        await createMovieReview({
          id_usuario: userId,
          id_pelicula: Number(movieId),
          puntuacion_estrellas: value,
          comentario: '',
        });
      }

      const [nextReviews, nextMovie] = await Promise.all([
        getMovieReviews(movieId, userId),
        getMovieById(movieId),
      ]);

      setReviews(nextReviews);
      setMovie((currentMovie) => {
        const mergedMovie = mergeMovieDetails(currentMovie, nextMovie);
        writeCachedMovie(movieId, mergedMovie);
        return mergedMovie;
      });
      setRatingMessage('');
    } catch (error) {
      setPersonalRating(previousRating);
      setRatingMessage(error?.message || 'No se pudo guardar tu calificación.');
    } finally {
      setRatingSaving(false);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    if (!userId) {
      setReviewError('No se pudo identificar tu sesion. Vuelve a iniciar sesion.');
      return;
    }

    if (hasWrittenReview) {
      setReviewError('Ya publicaste una reseña para esta pelicula.');
      return;
    }

    if (!personalRating) {
      setReviewError('Primero selecciona tu calificacion en estrellas.');
      return;
    }

    if (!comment.trim()) {
      setReviewError('Escribe un comentario para publicar tu reseña.');
      return;
    }

    try {
      setSavingReview(true);
      if (currentUserReview?.id) {
        await updateMovieReview(currentUserReview.id, {
          puntuacion_estrellas: personalRating,
          comentario: comment.trim(),
        });
      } else {
        await createMovieReview({
          id_usuario: userId,
          id_pelicula: Number(movieId),
          puntuacion_estrellas: personalRating,
          comentario: comment.trim(),
        });
      }

      const [nextReviews, nextMovie] = await Promise.all([
        getMovieReviews(movieId, userId),
        getMovieById(movieId),
      ]);

      setReviews(nextReviews);
      setMovie((currentMovie) => {
        const mergedMovie = mergeMovieDetails(currentMovie, nextMovie);
        writeCachedMovie(movieId, mergedMovie);
        return mergedMovie;
      });
      setComment('');
      setReviewSuccess('Tu reseña se publicó correctamente.');
      setReviewOpen(false);
    } catch (error) {
      setReviewError(error?.message || 'No se pudo publicar la reseña.');
    } finally {
      setSavingReview(false);
    }
  };

  const toggleInteraction = async (field) => {
    if (!userId) {
      setInteractionError('Inicia sesion para marcar peliculas.');
      return;
    }

    const previousInteraction = interaction;
    const isActivating = !interaction[field];
    const nextInteraction = {
      ...interaction,
      [field]: isActivating,
      ...(field === 'vista' ? { fecha_vista: isActivating ? new Date().toISOString() : null } : {}),
      ...(field === 'favorita' ? { fecha_favorito: isActivating ? new Date().toISOString() : null } : {}),
    };

    setInteraction(nextInteraction);
    setInteractionSaving(field);
    setInteractionError('');

    try {
      await updateMovieInteraction({
        id_usuario: userId,
        id_pelicula: Number(movieId),
        ...nextInteraction,
      });

      const [savedInteraction, nextMovie] = await Promise.all([
        getMovieInteraction(userId, movieId),
        getMovieById(movieId),
      ]);

      setInteraction({
        vista: Boolean(savedInteraction?.vista),
        favorita: Boolean(savedInteraction?.favorita),
        en_lista_seguimiento: Boolean(savedInteraction?.en_lista_seguimiento),
        fecha_vista: savedInteraction?.fecha_vista || savedInteraction?.fechaVista || nextInteraction.fecha_vista || null,
        fecha_favorito:
          savedInteraction?.fecha_favorito ||
          savedInteraction?.fecha_favorita ||
          savedInteraction?.fechaFavorito ||
          nextInteraction.fecha_favorito ||
          null,
      });
      setMovie((currentMovie) => {
        const mergedMovie = mergeMovieDetails(currentMovie, nextMovie);
        writeCachedMovie(movieId, mergedMovie);
        return mergedMovie;
      });
    } catch (error) {
      setInteraction(previousInteraction);
      setInteractionError(error?.message || 'No se pudo guardar la interaccion.');
    } finally {
      setInteractionSaving('');
    }
  };

  const handleReviewLike = async (reviewId) => {
    if (!userId) {
      setInteractionError('Inicia sesión para dar like a reseñas.');
      return;
    }

    const targetReview = reviews.find((review) => review.id === reviewId);
    setReviews((currentReviews) =>
      currentReviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              likedByMe: !review.likedByMe,
              likes: Math.max(0, Number(review.likes || 0) + (review.likedByMe ? -1 : 1)),
            }
          : review
      )
    );

    try {
      const savedLike = await likeMovieReview(reviewId, userId);
      const savedLikedByMe = Boolean(savedLike?.liked_by_me ?? savedLike?.likedByMe);
      const savedTotalLikes = Number(savedLike?.total_likes ?? savedLike?.totalLikes ?? savedLike?.likes ?? 0);
      setReviews((currentReviews) =>
        currentReviews.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                likedByMe: savedLikedByMe,
                likes: savedTotalLikes,
              }
            : review
        )
      );
    } catch (error) {
      setReviews((currentReviews) => currentReviews.map((review) => (
        review.id === reviewId ? targetReview : review
      )));
      setInteractionError(error?.message || 'No se pudo actualizar el like.');
    }
  };

  const handleToggleReviewComments = async (reviewId) => {
    if (expandedReviewId === reviewId) {
      setExpandedReviewId(null);
      return;
    }

    setExpandedReviewId(reviewId);
    setCommentError('');
    if (reviewComments[reviewId]) return;

    try {
      const comments = await getReviewComments(reviewId);
      setReviewComments((currentComments) => ({
        ...currentComments,
        [reviewId]: comments,
      }));
    } catch (error) {
      setCommentError(error?.message || 'No se pudieron cargar los comentarios.');
    }
  };

  const handleAddReviewComment = async (reviewId) => {
    const text = String(commentDrafts[reviewId] || '').trim();
    if (!text) return;

    if (!userId) {
      setCommentError('Inicia sesión para comentar una reseña.');
      return;
    }

    try {
      setCommentSavingId(reviewId);
      setCommentError('');
      const savedComment = await createReviewComment(reviewId, {
        id_usuario: userId,
        texto: text,
      });
      setReviewComments((currentComments) => ({
        ...currentComments,
        [reviewId]: [...(currentComments[reviewId] || []), savedComment],
      }));
      setCommentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [reviewId]: '',
      }));
      setReviews((currentReviews) => currentReviews.map((review) => (
        review.id === reviewId
          ? { ...review, totalComments: Number(review.totalComments || 0) + 1 }
          : review
      )));
      setExpandedReviewId(reviewId);
    } catch (error) {
      setCommentError(error?.message || 'No se pudo publicar el comentario.');
    } finally {
      setCommentSavingId(null);
    }
  };

  const visiblePersonalRating = hoveredPersonalRating || personalRating;

  return (
    <div className="min-h-screen bg-[#020b16] text-white">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/social"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
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
            <aside className="mx-auto w-full max-w-[280px] lg:mx-0">
              <img
                src={movie.imagenPoster || FALLBACK_POSTER}
                alt={movie.titulo}
                className="aspect-[2/3] w-full rounded-xl border border-slate-700 object-cover shadow-2xl shadow-black/40"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_POSTER;
                }}
              />

              <div className="mt-3 border-t border-slate-800 pt-3">
                <div className="grid grid-cols-3 divide-x divide-slate-800/80 text-center">
                  <div className="px-2">
                    <StarRatingDisplay rating={movie.rating} sizeClass="h-3.5 w-3.5" justifyClass="justify-center" />
                    <p className="mt-1 text-sm font-black text-white">{movie.rating || 0}/5</p>
                    <p className="text-[0.65rem] font-bold uppercase text-white/40">{movie.totalResenas || reviews.length || 0} reseñas</p>
                  </div>
                  <div className="px-2">
                    <Eye className="mx-auto h-3.5 w-3.5 text-sky-300" />
                    <p className="mt-1 text-sm font-black text-white">{movie.totalVistas || 0}</p>
                    <p className="text-[0.65rem] font-bold uppercase text-white/40">Vistas</p>
                  </div>
                  <div className="px-2">
                    <Heart className="mx-auto h-3.5 w-3.5 text-rose-300" />
                    <p className="mt-1 text-sm font-black text-white">{movie.totalFavoritos || 0}</p>
                    <p className="text-[0.65rem] font-bold uppercase text-white/40">Favoritos</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleInteraction('vista')}
                    disabled={interactionSaving === 'vista'}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-black transition-colors ${
                      interaction.vista ? 'border-sky-400/70 text-sky-200 hover:bg-sky-500/10' : 'border-slate-700 text-white/55 hover:border-sky-400/50 hover:text-sky-200'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    Vista
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleInteraction('favorita')}
                    disabled={interactionSaving === 'favorita'}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-black transition-colors ${
                      interaction.favorita ? 'border-rose-400/70 text-rose-200' : 'border-slate-700 text-white/55 hover:border-rose-400/50 hover:text-rose-200'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${interaction.favorita ? 'fill-rose-300' : ''}`} />
                    Favorita
                  </button>
                </div>

                {interactionError && (
                  <p className="mt-3 text-xs font-semibold text-red-200">{interactionError}</p>
                )}
                {(interaction.fecha_vista || interaction.fecha_favorito) && (
                  <div className="mt-3 space-y-1 text-[0.7rem] font-semibold text-white/45">
                    {interaction.fecha_vista && <p>Vista: {new Date(interaction.fecha_vista).toLocaleDateString()}</p>}
                    {interaction.fecha_favorito && <p>Favorita: {new Date(interaction.fecha_favorito).toLocaleDateString()}</p>}
                  </div>
                )}
              </div>
            </aside>

            <div className="min-w-0">
              <div className="mb-6 aspect-[21/8] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                <img
                  src={movie.imagenBanner || movie.imagenTrailer || FALLBACK_BANNER}
                  alt={`Banner de ${movie.titulo}`}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_BANNER;
                  }}
                />
              </div>

              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-sky-300">Pelicula en Social</p>
                  <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
                    {movie.titulo}
                  </h1>
                  <p className="mt-3 text-base font-semibold text-white/60">
                    {[movie.anio, movie.genero, movie.duracion, movie.clasificacion].filter(Boolean).join(' - ')}
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

              <section className="mt-6 rounded-xl border border-amber-300/25 bg-slate-900/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-white">Tu calificacion</h2>
                  </div>
                  <div className="flex gap-1.5">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const selected = value <= visiblePersonalRating;

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleRatingChange(value)}
                          onMouseEnter={() => setHoveredPersonalRating(value)}
                          onMouseLeave={() => setHoveredPersonalRating(0)}
                          disabled={ratingSaving}
                          className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-wait"
                          aria-label={`${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
                        >
                          <Star className={`h-8 w-8 ${selected ? 'fill-amber-400 text-amber-400' : 'text-white/30'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                {ratingMessage && (
                  <p className="mt-3 text-sm font-semibold text-red-200">{ratingMessage}</p>
                )}
              </section>

              {reviewOpen && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="mt-6 rounded-xl border border-sky-300/25 bg-slate-900/70 p-5 shadow-xl shadow-black/20"
                >
                  <h2 className="text-xl font-extrabold text-white">Escribe tu reseña</h2>
                  <p className="mt-1 text-sm font-semibold text-white/55">
                    La calificacion va separada. Publica solo un comentario para acompanar tus estrellas.
                  </p>

                  {hasWrittenReview && (
                    <div className="mt-5 rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
                      Ya publicaste una reseña para esta pelicula.
                    </div>
                  )}

                  <label className="mt-5 block">
                    <span className="text-sm font-bold text-white/75">Comentario</span>
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      rows={5}
                      maxLength={1000}
                      className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-400"
                      placeholder="Que destacarias de esta pelicula?"
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
                    disabled={savingReview || hasWrittenReview}
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
                  <h2 className="text-lg font-extrabold text-white">Direccion</h2>
                  <p className="mt-2 font-semibold text-white/65">{movie.director || 'Por definir'}</p>
                </article>

                <article className="rounded-xl border border-slate-800 bg-slate-900/55 p-5">
                  <h2 className="text-lg font-extrabold text-white">Reparto</h2>
                  <p className="mt-2 font-semibold text-white/65">{movie.reparto || 'Por definir'}</p>
                </article>
              </div>

              <section className="mt-8">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-black text-white">Reseñas de la comunidad</h2>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-sm font-bold text-white/60">
                    {reviews.length} publicaciones
                  </span>
                </div>

                <div className="mt-4 space-y-4">
                  {reviewsLoading ? (
                    reviewSkeletonIds.map((skeletonId) => (
                      <div key={skeletonId} className="h-32 animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
                    ))
                  ) : reviewsError ? (
                    <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
                      {reviewsError}
                    </div>
                  ) : reviews.length > 0 ? (
                    reviews.map((review) => {
                      const comments = reviewComments[review.id] || [];
                      const profilePath = review.userId ? `/social/${review.userId}` : '/social';
                      const isExpanded = expandedReviewId === review.id;

                      return (
                      <article id={`review-${review.id}`} key={review.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                            {review.avatar ? (
                              <img src={review.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-black text-white/60">U</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Link to={profilePath} className="inline-flex min-h-11 max-w-full items-center truncate font-black text-white hover:text-sky-300">
                                {review.usuario}
                              </Link>
                              <StarRatingDisplay rating={review.rating} sizeClass="h-4 w-4" />
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                              {review.texto || 'Sin comentario.'}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleReviewLike(review.id)}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                                  review.likedByMe ? 'bg-sky-500 text-white' : 'border border-slate-700 text-white/70 hover:bg-slate-800'
                                }`}
                              >
                                <ThumbsUp className={`h-4 w-4 ${review.likedByMe ? 'fill-white' : ''}`} />
                                {review.likes || 0}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleReviewComments(review.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-white/70 transition-colors hover:bg-slate-800"
                              >
                                <MessageSquareText className="h-4 w-4" />
                                {reviewComments[review.id] ? comments.length : review.totalComments || 0}
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                                {commentError && (
                                  <p className="mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                                    {commentError}
                                  </p>
                                )}
                                <div className="space-y-3">
                                  {comments.length > 0 ? (
                                    comments.map((reviewComment) => (
                                      <div key={reviewComment.id} className="rounded-lg bg-slate-900 px-3 py-2">
                                        <p className="text-xs font-black text-white/75">{reviewComment.username}</p>
                                        <p className="mt-1 text-sm text-white/70">{reviewComment.text}</p>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm font-semibold text-white/45">Sin comentarios todavia.</p>
                                  )}
                                </div>
                                <div className="mt-4 flex gap-2">
                                  <input
                                    type="text"
                                    value={commentDrafts[review.id] || ''}
                                    onChange={(event) =>
                                      setCommentDrafts((currentDrafts) => ({
                                        ...currentDrafts,
                                        [review.id]: event.target.value,
                                      }))
                                    }
                                    maxLength={300}
                                    className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                                    placeholder="Comenta esta reseña"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddReviewComment(review.id)}
                                    disabled={commentSavingId === review.id}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#2a6bb7] px-3 py-2 text-sm font-extrabold text-white transition-colors hover:bg-[#2f77c9] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Send className="h-4 w-4" />
                                    {commentSavingId === review.id ? 'Enviando...' : 'Enviar'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-white/60">
                      Todavía no hay reseñas de otros usuarios.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </section>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
            No se encontro la pelicula solicitada.
          </div>
        )}
      </main>
    </div>
  );
};

export default SocialPelicula;
