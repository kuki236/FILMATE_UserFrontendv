import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from './Header.jsx';
import { ChevronDown, Eye, Film, Heart, MessageSquareText, PencilLine, Plus, Search, ThumbsUp, Trash2, UserCheck, UserPlus, X } from 'lucide-react';
import { getAuthSession } from './authSession';
import {
  addMovieToCollection,
  createCollection,
  deleteCollection,
  followUser,
  getCollectionMovies,
  getFollowers,
  getFollowing,
  getFollowingReviews,
  getMovieById,
  getMovies,
  getSocialSummary,
  getUserCollections,
  getUserInteractions,
  getUserProfile,
  getUserRatedMovies,
  getUserRatingDistribution,
  getUserReviews,
  removeMovieFromCollection,
  searchMovies,
  searchUsers,
  unfollowUser,
} from './filmateApi';

const FALLBACK_POSTER = 'https://placehold.co/400x600/0f172a/f8fafc?text=Filmate';
const DEFAULT_RATING_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const activitySkeletonIds = ['activity-a', 'activity-b', 'activity-c', 'activity-d', 'activity-e'];
const addMovieSkeletonIds = ['movie-a', 'movie-b', 'movie-c', 'movie-d', 'movie-e'];
const watchedSkeletonIds = ['watched-a', 'watched-b', 'watched-c', 'watched-d', 'watched-e', 'watched-f'];
const favoriteSkeletonIds = ['favorite-a', 'favorite-b', 'favorite-c', 'favorite-d', 'favorite-e'];
const favoriteListSkeletonIds = ['favorite-list-a', 'favorite-list-b', 'favorite-list-c', 'favorite-list-d', 'favorite-list-e', 'favorite-list-f', 'favorite-list-g', 'favorite-list-h', 'favorite-list-i', 'favorite-list-j'];
const collectionSkeletonIds = ['collection-a', 'collection-b', 'collection-c'];
const collectionMovieSkeletonIds = ['collection-movie-a', 'collection-movie-b', 'collection-movie-c', 'collection-movie-d'];
const userReviewSkeletonIds = ['user-review-a', 'user-review-b', 'user-review-c'];

const tabs = ['Perfil', 'Películas', 'Listas', 'Actividad', 'Reseñas', 'Favoritos'];

const getUserId = (user) => user?.id_usuario || user?.id || user?.user_id || null;
const isSameUser = (firstId, secondId) => String(firstId || '') === String(secondId || '');
const getRelatedUserId = (item) => (
  item?.id_usuario_seguido ||
  item?.id_seguido ||
  item?.seguido_id ||
  item?.seguido?.id_usuario ||
  item?.seguido?.id ||
  item?.usuario_seguido?.id_usuario ||
  item?.usuario_seguido?.id ||
  getUserId(item)
);
const getUniqueCount = (items, getKey) => new Set(
  items
    .map(getKey)
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(String)
).size;

const getMovieIdentifier = (movie) => (
  movie?.id ||
  movie?.id_pelicula ||
  movie?.pelicula?.id ||
  movie?.pelicula?.id_pelicula ||
  null
);

const getReviewId = (review) => review?.id_resena || review?.id;
const getReviewMovie = (review) => review?.pelicula || review?.movie || null;
const getReviewMovieId = (review) => review?.id_pelicula || getReviewMovie(review)?.id || getReviewMovie(review)?.id_pelicula;
const getReviewMovieTitle = (review) => getReviewMovie(review)?.titulo || 'Película';
const getReviewPoster = (review) => getReviewMovie(review)?.url_poster || getReviewMovie(review)?.imagenPoster || '';
const getReviewStars = (review) => Number(review?.puntuacion_estrellas ?? review?.rating ?? 0);
const getReviewText = (review) => review?.comentario ?? review?.texto ?? '';

const formatActivityDate = (value) => {
  if (!value) return 'Fecha no disponible';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getDisplayName = (user, isRegistered) => {
  if (!isRegistered) return 'Invitado';

  return (
    user?.username ||
    user?.nombreUsuario ||
    'usuario'
  );
};

const getBioText = (profile, isRegistered) => {
  if (!isRegistered) {
    return 'Estás navegando como invitado. Inicia sesión para cargar tu perfil social.';
  }

  return (
    profile?.bio ||
    profile?.descripcion ||
    profile?.presentacion ||
    'Aún no tienes una bio pública configurada.'
  );
};

const formatStat = (value) => String(Number.isFinite(value) ? value : 0);
const formatSelectedMoviesText = (count) => {
  const pluralSuffix = count > 1 ? 's' : '';
  return `${count} película${pluralSuffix} seleccionada${pluralSuffix}`;
};

const getValidRating = (rating) => {
  const numericRating = Number(rating);
  if (!Number.isFinite(numericRating)) return null;

  return Math.min(5, Math.max(1, numericRating));
};

const getRatingDistributionFromItems = (items) => {
  const distribution = { ...DEFAULT_RATING_DISTRIBUTION };

  items.forEach((item) => {
    const rating = Math.round(getValidRating(item.rating) || 0);
    if (rating >= 1 && rating <= 5) distribution[rating] += 1;
  });

  return distribution;
};

const getInteractionMovies = async (userId, predicate) => {
  const interactions = await getUserInteractions(userId);
  const movieIds = interactions
    .filter(predicate)
    .map((item) => item.id_pelicula);

  const movies = await Promise.all(movieIds.map((id) => getMovieById(id).catch(() => null)));
  return movies.filter(Boolean);
};

const loadCollectionsWithPreviews = async (userId) => {
  const data = await getUserCollections(userId);
  const collections = Array.isArray(data) ? data : [];
  const movieEntries = await Promise.all(
    collections.map(async (collection) => {
      try {
        const movies = await getCollectionMovies(collection.id_coleccion);
        return [collection.id_coleccion, Array.isArray(movies) ? movies : []];
      } catch {
        return [collection.id_coleccion, []];
      }
    })
  );

  return {
    collections,
    moviesByCollection: Object.fromEntries(movieEntries),
  };
};

export const Social = () => {
  const navigate = useNavigate();
  const { profileUserId } = useParams();
  const [session] = useState(() => getAuthSession());
  const sessionUser = session?.user;
  const isRegistered = session?.mode === 'registered';
  const userId = getUserId(sessionUser);
  const viewedUserId = profileUserId || userId;
  const isOwnProfile = isSameUser(viewedUserId, userId);
  const shouldLoadSocial = Boolean(isRegistered && viewedUserId);

  const [profile, setProfile] = useState(isOwnProfile ? sessionUser || null : null);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [socialStatsData, setSocialStatsData] = useState({
    totalMovies: 0,
    totalReviews: 0,
    followers: 0,
    following: 0,
  });
  const [ratingDistribution, setRatingDistribution] = useState(DEFAULT_RATING_DISTRIBUTION);
  const [ratedMovies, setRatedMovies] = useState([]);
  const [activeTab, setActiveTab] = useState('Perfil');
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [watchedLoading, setWatchedLoading] = useState(false);
  const [watchedFilter, setWatchedFilter] = useState('all');
  const [favoriteTabMovies, setFavoriteTabMovies] = useState([]);
  const [favoriteTabLoading, setFavoriteTabLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [expandedCollectionId, setExpandedCollectionId] = useState(null);
  const [collectionMovies, setCollectionMovies] = useState({});
  const [collectionMoviesLoading, setCollectionMoviesLoading] = useState({});
  const [userReviews, setUserReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsScope, setReviewsScope] = useState('profile');
  const [activityItems, setActivityItems] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityScope, setActivityScope] = useState('profile');
  const [interactionsMap, setInteractionsMap] = useState({});
  const [expandedReviews, setExpandedReviews] = useState({});
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [unfollowLoading, setUnfollowLoading] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [createListError, setCreateListError] = useState('');
  const [listFilter, setListFilter] = useState('');
  const [addMovieToCollectionId, setAddMovieToCollectionId] = useState(null);
  const [allMovies, setAllMovies] = useState([]);
  const [allMoviesLoading, setAllMoviesLoading] = useState(false);
  const [addMovieFilter, setAddMovieFilter] = useState('');
  const [pendingMovieIds, setPendingMovieIds] = useState(new Set());
  const [deleteCollectionConfirm, setDeleteCollectionConfirm] = useState(null);
  const [removeMovieConfirm, setRemoveMovieConfirm] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('');
  const [reviewSort, setReviewSort] = useState('desc');
  const [reviewShowOnlyFav, setReviewShowOnlyFav] = useState(false);
  const [query, setQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [movieSearchResults, setMovieSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');
  const [movieSearchError, setMovieSearchError] = useState('');
  const [loading, setLoading] = useState(shouldLoadSocial);
  const [loadError, setLoadError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followError, setFollowError] = useState('');
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');

  useEffect(() => {
    let active = true;

    if (!shouldLoadSocial) {
      return () => {
        active = false;
      };
    }

    const resetTimer = globalThis.window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setLoadError('');
      setFollowError('');
      setIsFollowing(false);
      setProfile(isOwnProfile ? sessionUser || null : null);
      setFavoriteMovies([]);
      setRatedMovies([]);
      setRatingDistribution(DEFAULT_RATING_DISTRIBUTION);
      setSocialStatsData({
        totalMovies: 0,
        totalReviews: 0,
        followers: 0,
        following: 0,
      });
    }, 0);

    Promise.allSettled([
      getSocialSummary(viewedUserId),
      getUserRatingDistribution(viewedUserId),
      getUserRatedMovies(viewedUserId),
      getUserInteractions(viewedUserId),
      getFollowers(viewedUserId),
      getFollowing(viewedUserId),
      !isOwnProfile && userId ? getFollowing(userId) : Promise.resolve([]),
    ])
      .then(([
        summaryResult,
        ratingResult,
        ratedMoviesResult,
        interactionsResult,
        followersResult,
        viewedFollowingResult,
        currentUserFollowingResult,
      ]) => {
        if (!active) return;

        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          const summary = summaryResult.value;
          if (summary.profile) setProfile(summary.profile);
          setSocialStatsData(summary.stats);
          setFavoriteMovies(summary.favoriteMovies);
        }

        if (ratingResult.status === 'fulfilled') setRatingDistribution(ratingResult.value);
        if (ratedMoviesResult.status === 'fulfilled') setRatedMovies(ratedMoviesResult.value);
        setSocialStatsData((currentStats) => ({
          ...currentStats,
          totalMovies:
            interactionsResult.status === 'fulfilled'
              ? getUniqueCount(
                  interactionsResult.value.filter((item) => item?.vista),
                  (item) => item.id_pelicula
                )
              : 0,
          followers:
            followersResult.status === 'fulfilled'
              ? getUniqueCount(followersResult.value, (item) => getRelatedUserId(item) || item?.id_seguidor)
              : 0,
          following:
            viewedFollowingResult.status === 'fulfilled'
              ? getUniqueCount(viewedFollowingResult.value, getRelatedUserId)
              : 0,
        }));
        if (currentUserFollowingResult.status === 'fulfilled') {
          setIsFollowing(currentUserFollowingResult.value.some((item) => isSameUser(getRelatedUserId(item), viewedUserId)));
        }

        const hasFailure = [
          summaryResult,
          ratingResult,
          ratedMoviesResult,
          interactionsResult,
          followersResult,
          viewedFollowingResult,
        ].some((result) => result.status === 'rejected');

        if (hasFailure) {
          setLoadError('No se pudieron cargar todos los datos sociales. Mostrando la información disponible.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      globalThis.window.clearTimeout(resetTimer);
    };
  }, [isOwnProfile, sessionUser, shouldLoadSocial, userId, viewedUserId]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    let active = true;

    if (!shouldLoadSocial || normalizedQuery.length < 2) {
      const timer = globalThis.window.setTimeout(() => {
        if (!active) return;
        setUserSearchResults([]);
        setMovieSearchResults([]);
        setSearchLoading(false);
        setUserSearchError('');
        setMovieSearchError('');
      }, 0);

      return () => {
        active = false;
        globalThis.window.clearTimeout(timer);
      };
    }

    const timer = globalThis.window.setTimeout(() => {
      if (!active) return;
      setSearchLoading(true);
      setUserSearchError('');
      setMovieSearchError('');

      Promise.allSettled([
        searchUsers(normalizedQuery),
        searchMovies(normalizedQuery),
      ])
        .then(([usersResult, moviesResult]) => {
          if (!active) return;

          if (usersResult.status === 'fulfilled') {
            setUserSearchResults(usersResult.value);
          } else {
            setUserSearchResults([]);
            setUserSearchError(usersResult.reason?.message || 'No se pudo buscar usuarios.');
          }

          if (moviesResult.status === 'fulfilled') {
            setMovieSearchResults(moviesResult.value);
          } else {
            setMovieSearchResults([]);
            setMovieSearchError(moviesResult.reason?.message || 'No se pudo buscar películas.');
          }
        })
        .finally(() => {
          if (active) setSearchLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      globalThis.window.clearTimeout(timer);
    };
  }, [query, shouldLoadSocial]);

  useEffect(() => {
    if (activeTab !== 'Películas' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    const loadingTimer = globalThis.window.setTimeout(() => {
      if (active) setWatchedLoading(true);
    }, 0);

    getInteractionMovies(viewedUserId, (item) => item.vista)
      .then((movies) => {
        if (!active) return;
        setWatchedMovies(movies);
      })
      .catch(() => {
        if (active) setWatchedMovies([]);
      })
      .finally(() => {
        if (active) setWatchedLoading(false);
      });

    return () => {
      active = false;
      globalThis.window.clearTimeout(loadingTimer);
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Favoritos' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    const loadingTimer = globalThis.window.setTimeout(() => {
      if (active) setFavoriteTabLoading(true);
    }, 0);

    getInteractionMovies(viewedUserId, (item) => item.favorita)
      .then((movies) => {
        if (!active) return;
        setFavoriteTabMovies(movies);
      })
      .catch(() => {
        if (active) setFavoriteTabMovies([]);
      })
      .finally(() => {
        if (active) setFavoriteTabLoading(false);
      });

    return () => {
      active = false;
      globalThis.window.clearTimeout(loadingTimer);
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Reseñas' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    const loadingTimer = globalThis.window.setTimeout(() => {
      if (active) setReviewsLoading(true);
    }, 0);

    const reviewsRequest = reviewsScope === 'following'
      ? getFollowingReviews(viewedUserId).then((reviews) => [reviews, []])
      : Promise.allSettled([getUserReviews(viewedUserId), getUserInteractions(viewedUserId)])
          .then(([reviewsResult, interactionsResult]) => {
            if (reviewsResult.status === 'rejected') throw reviewsResult.reason;
            return [
              reviewsResult.value,
              interactionsResult.status === 'fulfilled' ? interactionsResult.value : [],
            ];
          });

    reviewsRequest
      .then(([reviews, interactions]) => {
        if (!active) return;
        setUserReviews(reviews);
        setInteractionsMap(Object.fromEntries(
          interactions.map((item) => [item.id_pelicula, item])
        ));
      })
      .catch(() => {
        if (active) setUserReviews([]);
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
      globalThis.window.clearTimeout(loadingTimer);
    };
  }, [activeTab, reviewsScope, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Actividad' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    const loadingTimer = globalThis.window.setTimeout(() => {
      if (active) setActivityLoading(true);
    }, 0);

    Promise.allSettled([
      getUserReviews(viewedUserId),
      getUserInteractions(viewedUserId),
      getFollowing(viewedUserId),
      getFollowingReviews(viewedUserId),
    ])
      .then(async ([reviewsResult, interactionsResult, followingResult, followingReviewsResult]) => {
        if (!active) return;

        const reviews = reviewsResult.status === 'fulfilled' ? reviewsResult.value : [];
        const interactions = interactionsResult.status === 'fulfilled' ? interactionsResult.value : [];
        const following = followingResult.status === 'fulfilled' ? followingResult.value : [];
        const followingReviews = followingReviewsResult.status === 'fulfilled' ? followingReviewsResult.value : [];
        const movieIds = [
          ...new Set(
            interactions
              .filter((item) => item.vista || item.favorita)
              .map((item) => item.id_pelicula)
              .filter(Boolean)
              .map(String)
          ),
        ];
        const movieEntries = await Promise.all(
          movieIds.map(async (movieId) => {
            try {
              return [movieId, await getMovieById(movieId)];
            } catch {
              return [movieId, null];
            }
          })
        );
        const followedIds = [
          ...new Set(
            following
              .map(getRelatedUserId)
              .filter(Boolean)
              .map(String)
          ),
        ];
        const followedProfileEntries = await Promise.all(
          followedIds.map(async (followedId) => {
            try {
              return [followedId, await getUserProfile(followedId)];
            } catch {
              return [followedId, null];
            }
          })
        );

        if (!active) return;

        const moviesById = Object.fromEntries(movieEntries);
        const followedProfilesById = Object.fromEntries(followedProfileEntries);
        const reviewActivities = reviews.map((review) => ({
          id: `review-${review.id}`,
          type: 'review',
          icon: MessageSquareText,
          title: `Reseno ${review.movie?.titulo || 'una pelicula'}`,
          detail: review.texto || 'Sin comentario.',
          date: review.fechaPublicacion,
          movie: review.movie,
        }));
        const followingReviewActivities = followingReviews.map((review) => {
          const followedName = String(review.usuario || 'Usuario').replace(/^@/, '');
          const hasComment = Boolean(review.texto?.trim());
          const rating = Number(review.rating || 0);
          const movieTitle = review.movie?.titulo || 'una pelicula';

          return {
            id: `following-review-${review.id}`,
            type: hasComment ? 'following-review' : 'following-rating',
            icon: MessageSquareText,
            title: hasComment
              ? `@${followedName} reseño ${movieTitle}`
              : `@${followedName} califico ${movieTitle}`,
            detail: hasComment
              ? review.texto
              : rating > 0
                ? `Le dio ${rating} de 5 estrellas.`
                : 'Registro una calificacion.',
            date: review.fechaPublicacion,
            movie: review.movie,
          };
        });
        const likeActivities = reviews
          .filter((review) => Number(review.likes || 0) > 0)
          .map((review) => ({
            id: `review-like-${review.id}`,
            type: 'like',
            icon: ThumbsUp,
            title: `${review.likes} ${Number(review.likes) === 1 ? 'like' : 'likes'} en su reseña`,
            detail: review.movie?.titulo || review.texto || 'Reseña de la comunidad.',
            date: review.fechaPublicacion,
            movie: review.movie,
          }));
        const interactionActivities = interactions.flatMap((item) => {
          const interactionMovie = moviesById[String(item.id_pelicula)];
          const items = [];

          if (item.favorita) {
            items.push({
              id: `favorite-${item.id_pelicula}`,
              type: 'favorite',
              icon: Heart,
              title: `Marco como favorita ${interactionMovie?.titulo || 'una pelicula'}`,
              detail: 'Agregada a su lista completa de favoritas.',
              date: item.fecha_favorito || item.fecha_actualizacion || item.fecha_creacion,
              movie: interactionMovie,
            });
          }

          if (item.vista) {
            items.push({
              id: `watched-${item.id_pelicula}`,
              type: 'watched',
              icon: Eye,
              title: `Marco como vista ${interactionMovie?.titulo || 'una pelicula'}`,
              detail: 'Registrada en peliculas vistas.',
              date: item.fecha_vista || item.fecha_actualizacion || item.fecha_creacion,
              movie: interactionMovie,
            });
          }

          return items;
        });
        const followingActivities = following.map((item) => {
          const followedId = getRelatedUserId(item);
          const followedProfile = followedProfilesById[String(followedId || '')];
          const followedName =
            followedProfile?.username ||
            followedProfile?.nombre ||
            item?.username ||
            item?.seguido?.username ||
            item?.usuario_seguido?.username ||
            item?.seguido?.nombre ||
            item?.usuario_seguido?.nombre ||
            item?.nombre_usuario ||
            'usuario';

          return {
            id: `following-${followedId || followedName}`,
            type: 'following',
            icon: UserPlus,
            title: `Comenzo a seguir a @${String(followedName).replace(/^@/, '')}`,
            detail: 'Nueva conexion social.',
            date: item.fecha_seguimiento || item.fecha_creacion,
          };
        });

        setUserReviews(reviews);
        const profileActivityItems = [
          ...reviewActivities,
          ...likeActivities,
          ...interactionActivities,
          ...followingActivities,
        ];
        const nextActivityItems = activityScope === 'following'
          ? followingReviewActivities
          : profileActivityItems;

        setActivityItems(nextActivityItems.sort((first, second) => {
          const firstDate = Date.parse(first.date || '') || 0;
          const secondDate = Date.parse(second.date || '') || 0;
          return secondDate - firstDate;
        }));
      })
      .catch(() => {
        if (active) setActivityItems([]);
      })
      .finally(() => {
        if (active) setActivityLoading(false);
      });

    return () => {
      active = false;
      globalThis.window.clearTimeout(loadingTimer);
    };
  }, [activeTab, activityScope, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Listas' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    const loadingTimer = globalThis.window.setTimeout(() => {
      if (active) setCollectionsLoading(true);
    }, 0);

    loadCollectionsWithPreviews(viewedUserId)
      .then(({ collections: loadedCollections, moviesByCollection }) => {
        if (!active) return;
        setCollections(loadedCollections);
        setCollectionMovies((prev) => ({ ...prev, ...moviesByCollection }));

        // Carga inmediata de películas de todas las listas para los previews
      })
      .catch(() => {
        if (active) setCollections([]);
      })
      .finally(() => {
        if (active) setCollectionsLoading(false);
      });

    return () => {
      active = false;
      globalThis.window.clearTimeout(loadingTimer);
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  const handleToggleCollection = (collectionId) => {
    if (expandedCollectionId === collectionId) {
      setExpandedCollectionId(null);
      return;
    }

    setExpandedCollectionId(collectionId);

    if (collectionMovies[collectionId]) return;

    setCollectionMoviesLoading((prev) => ({ ...prev, [collectionId]: true }));

    getCollectionMovies(collectionId)
      .then((data) => {
        setCollectionMovies((prev) => ({
          ...prev,
          [collectionId]: Array.isArray(data) ? data : [],
        }));
      })
      .catch((error) => {
        setCollectionMovies((prev) => ({ ...prev, [collectionId]: [] }));
        setLoadError(error?.message || 'No se pudo cargar la lista.');
      })
      .finally(() => {
        setCollectionMoviesLoading((prev) => ({ ...prev, [collectionId]: false }));
      });
  };

  const handleUnfollow = () => {
    if (!userId || !viewedUserId || unfollowLoading) return;

    setUnfollowLoading(true);

    unfollowUser(userId, viewedUserId)
      .then(() => {
        setIsFollowing(false);
        setSocialStatsData((currentStats) => ({
          ...currentStats,
          followers: Math.max(0, Number(currentStats.followers || 0) - 1),
        }));
        setShowUnfollowConfirm(false);
      })
      .catch((error) => {
        setFollowError(error?.message || 'No se pudo dejar de seguir a este usuario.');
      })
      .finally(() => {
        setUnfollowLoading(false);
      });
  };

  const handleCreateList = () => {
    if (!newListTitle.trim() || !userId || creatingList) return;

    const duplicate = collections.some(
      (c) => (c.titulo_coleccion || '').trim().toLowerCase() === newListTitle.trim().toLowerCase()
    );
    if (duplicate) {
      setCreateListError('Ya tienes una lista con ese nombre. Elige otro.');
      return;
    }

    setCreatingList(true);
    setCreateListError('');

    createCollection({
        id_usuario: Number(userId),
        titulo_coleccion: newListTitle.trim(),
        descripcion: newListDescription.trim() || null,
    })
      .then((newCollection) => {
        setCollections((prev) => [newCollection, ...prev]);
        setNewListTitle('');
        setNewListDescription('');
        setCreateListError('');
        setShowCreateList(false);
      })
      .catch(() => {
        setCreateListError('No se pudo crear la lista. Inténtalo de nuevo.');
      })
      .finally(() => {
        setCreatingList(false);
      });
  };

  const handleDeleteCollection = (collectionId) => {
    deleteCollection(collectionId)
      .then(() => {
        setCollections((prev) => prev.filter((c) => c.id_coleccion !== collectionId));
        if (expandedCollectionId === collectionId) setExpandedCollectionId(null);
        setCollectionMovies((prev) => {
          const next = { ...prev };
          delete next[collectionId];
          return next;
        });
        setDeleteCollectionConfirm(null);
      })
      .catch((error) => {
        setLoadError(error?.message || 'No se pudo eliminar la lista.');
      });
  };

  const handleRemoveMovieFromCollection = (collectionId, movieId) => {
    removeMovieFromCollection(collectionId, movieId)
      .then(() => {
        setCollectionMovies((prev) => ({
          ...prev,
          [collectionId]: (prev[collectionId] || []).filter((m) => m.id_pelicula !== movieId),
        }));
        setRemoveMovieConfirm(null);
      })
      .catch((error) => {
        setLoadError(error?.message || 'No se pudo quitar la película de la lista.');
      });
  };

  const handleOpenAddMovie = (collectionId) => {
    setAddMovieToCollectionId(collectionId);
    setAddMovieFilter('');
    setPendingMovieIds(new Set());
    if (allMovies.length > 0) return;

    setAllMoviesLoading(true);
    getMovies({ limit: 200 })
      .then((data) => setAllMovies(data.map((movie) => ({
        id_pelicula: movie.id,
        titulo: movie.titulo,
        url_poster: movie.imagenPoster,
      }))))
      .catch((error) => {
        setAllMovies([]);
        setLoadError(error?.message || 'No se pudo cargar el catálogo de películas.');
      })
      .finally(() => setAllMoviesLoading(false));
  };

  const handleApplyAddMovies = (collectionId) => {
    const toAdd = allMovies.filter((m) => pendingMovieIds.has(m.id_pelicula));
    if (toAdd.length === 0) { setAddMovieToCollectionId(null); return; }

    Promise.all(
      toAdd.map((movie) =>
        addMovieToCollection(collectionId, movie.id_pelicula)
          .then(() => ({ id_pelicula: movie.id_pelicula, titulo: movie.titulo, url_poster: movie.url_poster }))
          .catch(() => null)
      )
    ).then((results) => {
      const added = results.filter(Boolean);
      if (added.length !== toAdd.length) {
        setLoadError('Algunas películas no pudieron agregarse a la lista.');
      }
      if (added.length > 0) {
        setCollectionMovies((prev) => ({
          ...prev,
          [collectionId]: [...(prev[collectionId] || []), ...added],
        }));
      }
      setAddMovieToCollectionId(null);
    });
  };

  const profileFallback = isOwnProfile ? sessionUser : null;
  const displayName = getDisplayName(profile || profileFallback, isRegistered);
  const avatarUrl = profile?.url_perfil || profileFallback?.url_perfil || '';
  const watchedMoviesCount = Number(socialStatsData.totalMovies || 0);
  const bioText = getBioText(profile, isRegistered);
  const hasRealBio = Boolean(profile?.bio || profile?.descripcion || profile?.presentacion);
  const chartRatingItems = ratedMovies
    .map((item) => ({
      ...item,
      rating: getValidRating(item.rating),
    }))
    .filter((item) => item.rating !== null);
  const ratedMoviesDistribution = getRatingDistributionFromItems(chartRatingItems);
  const hasRatedMovieDistribution = chartRatingItems.length > 0;
  const chartDistribution = hasRatedMovieDistribution ? ratedMoviesDistribution : ratingDistribution;
  const maxRatingCount = Math.max(1, ...Object.values(chartDistribution).map((value) => Number(value) || 0));
  const totalRatings = Object.values(chartDistribution).reduce((sum, value) => sum + Number(value || 0), 0);
  const ratingBuckets = [1, 2, 3, 4, 5].map((rating) => {
    const count = Number(chartDistribution[rating] || 0);
    const movieLabel = count === 1 ? 'pelicula calificada' : 'peliculas calificadas';
    const label = count === 1 ? 'calificación' : 'calificaciones';

    return {
      rating,
      count,
      label,
      movieLabel,
      tooltip: `${rating} estrellas: ${count} ${label}`,
      hoverText: String(count),
      height: 12 + (count / maxRatingCount) * 72,
    };
  });

  const socialStats = [
    { value: formatStat(watchedMoviesCount), label: 'Películas' },
    { value: formatStat(socialStatsData.following), label: 'Siguiendo' },
    { value: formatStat(socialStatsData.followers), label: 'Seguidores' },
  ];

  const normalizedSearchQuery = query.trim().toLowerCase();
  const displayedUserSearchResults = normalizedSearchQuery
    ? userSearchResults.filter((user) => [user.username, user.nombre, user.correo]
        .some((value) => String(value || '').toLowerCase().includes(normalizedSearchQuery)))
    : userSearchResults;
  const displayedMovieSearchResults = movieSearchResults.slice(0, 8);
  const favoriteSlots = Array.from(
    { length: 5 },
    (_, index) => (loading ? null : favoriteMovies[index] || null)
  );
  const ratingByMovieId = Object.fromEntries(
    chartRatingItems
      .map((item) => [getMovieIdentifier(item.movie || item), item.rating])
      .filter(([movieKey, rating]) => movieKey && rating)
      .map(([movieKey, rating]) => [String(movieKey), rating])
  );

  const getUserMovieRating = (movie) => {
    const movieKey = getMovieIdentifier(movie);
    if (!movieKey) return null;
    return ratingByMovieId[String(movieKey)] || null;
  };

  const watchedFilterOptions = [
    { id: 'all', label: 'Todas', title: 'Peliculas Vistas' },
    { id: 'best', label: 'Mejor calificadas', title: 'Peliculas mejor calificadas' },
    { id: 'low', label: 'Menor calificadas', title: 'Peliculas menor calificadas' },
    { id: 'unrated', label: 'Sin calificacion', title: 'Peliculas vistas sin calificacion' },
  ];
  const watchedTitle =
    watchedFilterOptions.find((option) => option.id === watchedFilter)?.title ||
    'Peliculas Vistas';
  const displayedWatchedMovies = watchedMovies
    .filter((movie) => {
      const rating = getUserMovieRating(movie);
      return watchedFilter === 'unrated' ? !rating : true;
    })
    .sort((firstMovie, secondMovie) => {
      const firstRating = Number(getUserMovieRating(firstMovie) || 0);
      const secondRating = Number(getUserMovieRating(secondMovie) || 0);

      if (watchedFilter === 'best') return secondRating - firstRating;
      if (watchedFilter === 'low') return firstRating - secondRating;
      return 0;
    });

  const renderMovieRating = (movie) => {
    const rating = getUserMovieRating(movie);
    const roundedRating = Math.round(Number(rating || 0));

    return (
      <div className="mt-2 flex h-5 items-center justify-center gap-0.5" aria-label={rating ? `${rating} de 5 estrellas` : 'Sin calificacion'}>
        {Array.from({ length: 5 }).map((_, index) => {
          const starValue = index + 1;
          const selected = starValue <= roundedRating;

          return (
            <span
              key={`${getMovieIdentifier(movie) || movie?.titulo || 'movie'}-rating-${starValue}`}
              className={`text-sm leading-none ${selected ? 'text-amber-400' : 'text-white/20'}`}
              aria-hidden="true"
            >
              ★
            </span>
          );
        })}
      </div>
    );
  };

  const movieGridClass = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7';
  const moviePosterClass = 'aspect-[2/3] w-full overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 transition-transform group-hover:-translate-y-1 group-hover:shadow-2xl';

  const handleImageFallback = (event) => {
    event.currentTarget.src = FALLBACK_POSTER;
  };

  const handleSelectUser = (selectedUser) => {
    const selectedUserId = getUserId(selectedUser);
    if (!selectedUserId) return;

    setQuery('');
    setUserSearchResults([]);
    navigate(isSameUser(selectedUserId, userId) ? '/social' : `/social/${selectedUserId}`);
  };

  const handleSelectMovie = (movie) => {
    if (!movie?.id) return;

    setQuery('');
    setUserSearchResults([]);
    setMovieSearchResults([]);
    navigate(`/social/pelicula/${movie.id}`, { state: { movie } });
  };

  const handleFollow = () => {
    if (!userId || !viewedUserId || isOwnProfile || isFollowing || followLoading) return;

    setFollowLoading(true);
    setFollowError('');

    followUser(userId, viewedUserId)
      .then(() => {
        setIsFollowing(true);
        setSocialStatsData((currentStats) => ({
          ...currentStats,
          followers: Number(currentStats.followers || 0) + 1,
        }));
      })
      .catch((error) => {
        setFollowError(error?.message || 'No se pudo seguir este usuario.');
      })
      .finally(() => {
        setFollowLoading(false);
      });
  };

  let followButtonLabel = 'Seguir';
  if (followLoading || unfollowLoading) {
    followButtonLabel = 'Cargando...';
  } else if (isFollowing) {
    followButtonLabel = 'Siguiendo';
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#020b16] text-white">
      <Header />

      <main className="flex flex-1 flex-col">
        <section className="shrink-0 border-b border-sky-300/60 px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="mx-auto flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#211c1f] bg-white text-slate-900 shadow-lg shadow-black/20 sm:mx-0">
                  {avatarUrl && failedAvatarUrl !== avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={() => setFailedAvatarUrl(avatarUrl)}
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#211c1f] text-white">
                      <span className="text-5xl leading-none">👤</span>
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left">
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 sm:text-4xl">
                    @{displayName}
                  </h1>

                  {isOwnProfile ? (
                    <Link
                      to="/social/editarPerfil"
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#2a6bb7] px-4 py-2 text-base font-bold text-white transition-colors hover:bg-[#2f77c9]"
                    >
                      <PencilLine className="h-4 w-4" />
                      {isRegistered ? 'Editar Perfil' : 'Modo invitado'}
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={isFollowing ? () => setShowUnfollowConfirm(true) : handleFollow}
                        disabled={followLoading || unfollowLoading}
                        className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-base font-bold text-white transition-colors disabled:cursor-default ${
                          isFollowing
                            ? 'bg-slate-600 hover:bg-slate-500'
                            : 'bg-[#2a6bb7] hover:bg-[#2f77c9] disabled:bg-slate-600'
                        }`}
                      >
                        {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {followButtonLabel}
                      </button>

                      {showUnfollowConfirm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                            <h3 className="text-lg font-extrabold text-white">¿Dejar de seguir?</h3>
                            <p className="mt-2 text-sm font-semibold text-white/60">
                              Dejarás de seguir a @{displayName}. Podrás volver a seguirlo cuando quieras.
                            </p>
                            <div className="mt-5 flex gap-3">
                              <button
                                type="button"
                                onClick={() => setShowUnfollowConfirm(false)}
                                className="flex-1 rounded-lg border border-slate-600 py-2 text-sm font-bold text-white/80 transition-colors hover:bg-slate-800"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleUnfollow}
                                disabled={unfollowLoading}
                                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:bg-slate-700"
                              >
                                {unfollowLoading ? 'Cargando...' : 'Dejar de seguir'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {followError && (
                    <p className="mt-2 text-sm font-semibold text-red-200">{followError}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 lg:justify-self-end">
                <div className="relative ml-auto w-full max-w-sm">
                  <label className="flex w-full items-center overflow-hidden rounded-xl bg-[#2a6bb7] px-3 py-2 shadow-lg shadow-blue-900/20">
                    <Search className="h-5 w-5 shrink-0 text-black" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      className="ml-3 min-w-0 flex-1 bg-transparent text-lg font-bold text-white outline-none placeholder:text-white/70"
                      placeholder="Buscar usuarios o películas"
                    />
                  </label>

                  {query.trim().length >= 2 && (
                    <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-md border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40">
                      {searchLoading ? (
                        <p className="px-4 py-3 text-sm font-semibold text-white/65">Buscando usuarios y películas...</p>
                      ) : (
                        <div className="max-h-96 overflow-y-auto">
                          {userSearchError && (
                            <p className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-red-200">
                              {userSearchError}
                            </p>
                          )}

                          {movieSearchError && (
                            <p className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-red-200">
                              {movieSearchError}
                            </p>
                          )}

                          {displayedUserSearchResults.length > 0 && (
                            <section>
                              <p className="border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-sky-200">
                                Usuarios
                              </p>
                              {displayedUserSearchResults.slice(0, 6).map((user) => (
                                <button
                                  key={user.id_usuario || user.id}
                                  type="button"
                                  onClick={() => handleSelectUser(user)}
                                  className="flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left transition-colors hover:bg-slate-900"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                                    {user.url_perfil ? (
                                      <img
                                        src={user.url_perfil}
                                        alt={user.username || 'Usuario'}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-sm font-black text-white/60">U</span>
                                    )}
                                  </div>
                                  <p className="min-w-0 truncate text-sm font-extrabold text-white">
                                    @{user.username || 'sin-username'}
                                  </p>
                                </button>
                              ))}
                            </section>
                          )}

                          {displayedMovieSearchResults.length > 0 && (
                            <section>
                              <p className="border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-black uppercase tracking-wider text-sky-200">
                                Películas
                              </p>
                              {displayedMovieSearchResults.map((movie) => (
                                <button
                                  key={movie.id}
                                  type="button"
                                  onClick={() => handleSelectMovie(movie)}
                                  className="flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-900"
                                >
                                  <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-800">
                                    {movie.imagenPoster ? (
                                      <img
                                        src={movie.imagenPoster}
                                        alt={movie.titulo}
                                        className="h-full w-full object-cover"
                                        onError={handleImageFallback}
                                      />
                                    ) : (
                                      <Film className="h-5 w-5 text-white/50" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-extrabold text-white">{movie.titulo}</p>
                                    <p className="truncate text-xs font-semibold text-white/50">
                                      {[movie.genero, movie.duracion].filter(Boolean).join(' · ')}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </section>
                          )}

                          {!userSearchError &&
                            !movieSearchError &&
                            displayedUserSearchResults.length === 0 &&
                            displayedMovieSearchResults.length === 0 && (
                              <p className="px-4 py-3 text-sm font-semibold text-white/65">Sin resultados encontrados.</p>
                            )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-0 text-center">
                  {socialStats.map((stat, index) => (
                    <div
                      key={stat.label}
                      className={`px-3 ${index !== socialStats.length - 1 ? 'border-r border-slate-500/80' : ''}`}
                    >
                      <p className="text-4xl font-black leading-none text-[#d8ced0]">{stat.value}</p>
                      <p className="mt-1 text-base font-medium text-[#c8c1c1]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {loadError && (
              <div className="mt-5 rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100">
                {loadError}
              </div>
            )}
          </div>
        </section>

        <section className="shrink-0 border-b border-sky-300/60 px-4 sm:px-6 lg:px-8">
          <div className="grid w-full grid-cols-2 gap-0 md:grid-cols-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                aria-current={tab === activeTab ? 'page' : undefined}
                onClick={() => setActiveTab(tab)}
                className={`border-x border-slate-800 py-4 text-base font-extrabold transition-colors sm:text-lg ${
                  tab === activeTab ? 'text-slate-100' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {activeTab === 'Perfil' && (
            <div className="grid w-full items-start gap-8 lg:grid-cols-[minmax(300px,0.32fr)_1fr]">
              <aside className="space-y-7">
                <div>
                  <h2 className="text-2xl font-bold text-white">Bio</h2>
                  <div className="mt-2 h-px w-full bg-white/60" />
                  <p className={`mt-3 text-lg font-semibold leading-snug ${hasRealBio ? 'text-white' : 'text-white/60'}`}>
                    {bioText}
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white">Clasificación Personal</h2>
                  <div className="mt-2 h-px w-full bg-white/60" />
                  <div className="mt-8 grid min-h-32 w-full grid-cols-5 items-end gap-1 overflow-visible">
                    {ratingBuckets.map((bucket) => (
                      <div key={bucket.rating} className="group relative flex min-w-0 flex-col items-center gap-2">
                        <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 w-max max-w-36 -translate-x-1/2 rounded-md border border-white/20 bg-slate-950 px-2 py-1 text-center text-xs font-bold text-white opacity-0 shadow-lg shadow-black/40 transition-opacity group-hover:opacity-100">
                          {bucket.hoverText}
                        </div>
                        <div
                          className={`w-full rounded-t-full transition-opacity group-hover:opacity-70 ${bucket.count ? 'bg-[#ff2b50]' : 'bg-white/20'}`}
                          style={{ height: bucket.height }}
                          title={bucket.tooltip}
                        />
                        <span className="text-sm font-bold text-amber-400" title={bucket.tooltip}>
                          &#9733; {bucket.rating}
                        </span>
                      </div>
                    ))}
                  </div>
                  {totalRatings > 0 ? (
                    <p className="mt-3 text-sm font-medium text-white/55">
                      {totalRatings} calificaciones registradas.
                    </p>
                  ) : (
                    <p className="mt-3 text-sm font-medium text-white/55">
                      Sin calificaciones disponibles.
                    </p>
                  )}
                </div>
              </aside>

              <div className="flex min-w-0 flex-col">
                <h2 className="mb-5 text-3xl font-extrabold text-slate-100">Películas Favoritas</h2>

                <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
                  {favoriteSkeletonIds.map((slotId, index) => {
                    const movie = favoriteSlots[index];

                    return movie ? (
                      <button
                        type="button"
                        key={`favorite-${movie.id}`}
                        className="group aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-md border border-slate-800 bg-slate-900 text-left shadow-xl shadow-black/25 transition-transform hover:-translate-y-1 hover:shadow-2xl"
                        title={movie.titulo}
                        onClick={() => navigate(`/social/pelicula/${movie.id}`, { state: { movie } })}
                      >
                        <img
                          src={movie.imagenPoster || FALLBACK_POSTER}
                          alt={movie.titulo}
                          className="h-full w-full object-cover"
                          onError={handleImageFallback}
                        />
                      </button>
                    ) : (
                      <div
                        key={slotId}
                        className="aspect-[2/3] w-full overflow-hidden rounded-md border border-slate-800 bg-gradient-to-br from-slate-800/90 via-slate-900 to-slate-800/70"
                        aria-label={loading ? 'Cargando película favorita' : 'Espacio de película favorita disponible'}
                      >
                        <div className="h-full w-full bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.04)_45%,transparent_65%)]" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Películas' && (
            <div className="w-full">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-3xl font-extrabold text-slate-100">{watchedTitle}</h2>
                <div className="flex flex-wrap gap-2">
                  {watchedFilterOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setWatchedFilter(option.id)}
                      className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                        watchedFilter === option.id
                          ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                          : 'border-slate-700 bg-slate-900 text-white/65 hover:border-sky-400/50 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {watchedLoading ? (
                <div className={movieGridClass}>
                  {watchedSkeletonIds.map((skeletonId) => (
                    <div
                      key={skeletonId}
                      className="aspect-[2/3] animate-pulse rounded-md border border-slate-800 bg-slate-800"
                    />
                  ))}
                </div>
              ) : watchedMovies.length > 0 ? (
                displayedWatchedMovies.length > 0 ? (
                <div className={movieGridClass}>
                  {displayedWatchedMovies.map((movie) => (
                    <button
                      type="button"
                      key={`watched-${movie.id}`}
                      className="group cursor-pointer text-left"
                      title={movie.titulo}
                      onClick={() => navigate(`/social/pelicula/${movie.id}`, { state: { movie } })}
                    >
                      <div className={moviePosterClass}>
                        <img
                          src={movie.imagenPoster || FALLBACK_POSTER}
                          alt={movie.titulo}
                          className="h-full w-full object-cover"
                          onError={handleImageFallback}
                        />
                      </div>
                      {renderMovieRating(movie)}
                    </button>
                  ))}
                </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                    No hay peliculas para este filtro.
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  No hay peliculas vistas aun.
                </div>
              )}
            </div>
          )}

          {activeTab === 'Actividad' && (
            <div className="w-full">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-3xl font-extrabold text-slate-100">
                  {activityScope === 'following' ? 'Actividad Following' : 'Actividad'}
                </h2>
                <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
                  {[
                    { id: 'profile', label: 'Perfil' },
                    { id: 'following', label: 'Following' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setActivityScope(option.id)}
                      className={`rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${
                        activityScope === option.id
                          ? 'bg-sky-500 text-white'
                          : 'text-white/55 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {activityLoading ? (
                <div className="space-y-3">
                  {activitySkeletonIds.map((skeletonId) => (
                    <div
                      key={skeletonId}
                      className="h-20 animate-pulse rounded-md border border-slate-800 bg-slate-900"
                    />
                  ))}
                </div>
              ) : activityItems.length > 0 ? (
                <div className="space-y-3">
                  {activityItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <article
                        key={item.id}
                        className="flex items-center gap-4 rounded-md border border-slate-800 bg-slate-900/45 px-4 py-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 text-sky-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{item.title}</p>
                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/50">{item.detail}</p>
                        </div>
                        {item.movie?.imagenPoster && (
                          <button
                            type="button"
                            onClick={() => navigate(`/social/pelicula/${item.movie.id}`, { state: { movie: item.movie } })}
                            className="hidden h-14 w-10 shrink-0 overflow-hidden rounded border border-slate-800 sm:block"
                            aria-label={item.movie.titulo}
                          >
                            <img
                              src={item.movie.imagenPoster || FALLBACK_POSTER}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={handleImageFallback}
                            />
                          </button>
                        )}
                        <span className="hidden text-xs font-bold text-white/35 md:block">
                          {formatActivityDate(item.date)}
                        </span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  Aun no hay actividad para mostrar.
                </div>
              )}
            </div>
          )}

          {activeTab === 'Favoritos' && (
            <div className="w-full">
              <div className="mb-5">
                <h2 className="text-3xl font-extrabold text-slate-100">Peliculas favoritas</h2>
              </div>

              {favoriteTabLoading ? (
                <div className={movieGridClass}>
                  {favoriteListSkeletonIds.map((skeletonId) => (
                    <div
                      key={skeletonId}
                      className="aspect-[2/3] animate-pulse rounded-md border border-slate-800 bg-slate-800"
                    />
                  ))}
                </div>
              ) : favoriteTabMovies.length > 0 ? (
                <div className={movieGridClass}>
                  {favoriteTabMovies.map((movie) => (
                    <button
                      type="button"
                      key={`favorite-list-${movie.id}`}
                      className="group cursor-pointer text-left"
                      title={movie.titulo}
                      onClick={() => navigate(`/social/pelicula/${movie.id}`, { state: { movie } })}
                    >
                      <div className={moviePosterClass}>
                        <img
                          src={movie.imagenPoster || FALLBACK_POSTER}
                          alt={movie.titulo}
                          className="h-full w-full object-cover"
                          onError={handleImageFallback}
                        />
                      </div>
                      {renderMovieRating(movie)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  No hay peliculas favoritas en la lista completa.
                </div>
              )}
            </div>
          )}

          {activeTab === 'Listas' && (
            <div className="w-full">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-3xl font-extrabold text-slate-100">Listas</h2>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => { setShowCreateList(true); setCreateListError(''); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2a6bb7] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2f77c9]"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva lista
                  </button>
                )}
              </div>

              <label className="mb-4 flex items-center gap-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-white/40" />
                <input
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                  placeholder="Buscar lista por nombre..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/40"
                />
              </label>

              {/* Modal crear lista */}
              {showCreateList && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                    <h3 className="text-lg font-extrabold text-white">Nueva lista</h3>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label htmlFor="new-list-title" className="block text-xs font-bold text-white/60">Nombre *</label>
                        <input
                          id="new-list-title"
                          value={newListTitle}
                          onChange={(e) => { setNewListTitle(e.target.value); setCreateListError(''); }}
                          maxLength={80}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                          placeholder="Ej: Películas del 2025"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-white/60">Descripción (opcional)</label>
                        <textarea
                          value={newListDescription}
                          onChange={(e) => setNewListDescription(e.target.value)}
                          rows={3}
                          maxLength={300}
                          className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                          placeholder="Una breve descripción..."
                        />
                      </div>
                      {createListError && (
                        <p className="text-xs font-semibold text-red-300">{createListError}</p>
                      )}
                    </div>
                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setShowCreateList(false); setNewListTitle(''); setNewListDescription(''); setCreateListError(''); }}
                        className="flex-1 rounded-lg border border-slate-600 py-2 text-sm font-bold text-white/80 transition-colors hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateList}
                        disabled={!newListTitle.trim() || creatingList}
                        className="flex-1 rounded-lg bg-[#2a6bb7] py-2 text-sm font-bold text-white transition-colors hover:bg-[#2f77c9] disabled:cursor-not-allowed disabled:bg-slate-700"
                      >
                        {creatingList ? 'Creando...' : 'Crear lista'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal confirmar eliminar lista */}
              {deleteCollectionConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                        <Trash2 className="h-5 w-5 text-red-400" />
                      </div>
                      <h3 className="text-lg font-extrabold text-white">Eliminar lista</h3>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white/60">
                      ¿Seguro que quieres eliminar <span className="font-extrabold text-white">"{deleteCollectionConfirm.titulo}"</span>? Esta acción no se puede deshacer.
                    </p>
                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setDeleteCollectionConfirm(null)}
                        className="flex-1 rounded-lg border border-slate-600 py-2 text-sm font-bold text-white/80 transition-colors hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(deleteCollectionConfirm.id)}
                        className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal confirmar quitar película */}
              {removeMovieConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                        <X className="h-5 w-5 text-red-400" />
                      </div>
                      <h3 className="text-lg font-extrabold text-white">Quitar película</h3>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white/60">
                      ¿Quitar <span className="font-extrabold text-white">"{removeMovieConfirm.movieTitle}"</span> de esta lista?
                    </p>
                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setRemoveMovieConfirm(null)}
                        className="flex-1 rounded-lg border border-slate-600 py-2 text-sm font-bold text-white/80 transition-colors hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMovieFromCollection(removeMovieConfirm.collectionId, removeMovieConfirm.movieId)}
                        className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal agregar películas con casillas y Aplicar/Cancelar */}
              {addMovieToCollectionId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                  <div className="mx-4 flex w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" style={{ maxHeight: '85vh' }}>
                    <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
                      <div>
                        <h3 className="text-lg font-extrabold text-white">Agregar películas a la lista</h3>
                        {pendingMovieIds.size > 0 && (
                          <p className="text-xs font-semibold text-sky-400">
                            {formatSelectedMoviesText(pendingMovieIds.size)}
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={() => setAddMovieToCollectionId(null)} className="rounded-md p-1 text-white/50 hover:text-white">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="shrink-0 border-b border-slate-800 px-5 py-3">
                      <label className="flex items-center gap-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                        <Search className="h-4 w-4 shrink-0 text-white/40" />
                        <input
                          value={addMovieFilter}
                          onChange={(e) => setAddMovieFilter(e.target.value)}
                          placeholder="Buscar película por nombre..."
                          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/40"
                          autoFocus
                        />
                      </label>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {allMoviesLoading ? (
                        <div className="space-y-3 p-5">
                          {addMovieSkeletonIds.map((skeletonId) => (
                            <div key={skeletonId} className="flex animate-pulse gap-3 rounded-lg bg-slate-800 p-3">
                              <div className="h-16 w-11 shrink-0 rounded bg-slate-700" />
                              <div className="flex-1 space-y-2 py-1">
                                <div className="h-4 w-2/3 rounded bg-slate-700" />
                                <div className="h-3 w-full rounded bg-slate-700" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (() => {
                        const alreadyInList = new Set((collectionMovies[addMovieToCollectionId] || []).map((m) => m.id_pelicula));
                        const filtered = allMovies.filter((m) => {
                          if (alreadyInList.has(m.id_pelicula)) return false;
                          if (!addMovieFilter.trim()) return true;
                          return (m.titulo || '').toLowerCase().includes(addMovieFilter.trim().toLowerCase());
                        });
                        if (filtered.length === 0) {
                          return (
                            <p className="p-5 text-sm font-semibold text-white/50">
                              {addMovieFilter.trim() ? 'Sin resultados para tu búsqueda.' : 'No hay películas disponibles para agregar.'}
                            </p>
                          );
                        }
                        return (
                          <ul className="divide-y divide-slate-800">
                            {filtered.map((movie) => {
                              const isSelected = pendingMovieIds.has(movie.id_pelicula);
                              return (
                                <li key={movie.id_pelicula}>
                                  <button
                                    type="button"
                                    className={`flex w-full cursor-pointer items-center gap-4 px-5 py-3 text-left transition-colors ${isSelected ? 'bg-sky-500/10' : 'hover:bg-slate-800/50'}`}
                                    onClick={() => setPendingMovieIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(movie.id_pelicula)) next.delete(movie.id_pelicula);
                                      else next.add(movie.id_pelicula);
                                      return next;
                                    })}
                                  >
                                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${isSelected ? 'border-sky-400 bg-sky-500' : 'border-slate-600'}`}>
                                    {isSelected && <span className="text-xs font-black text-white">✓</span>}
                                  </div>
                                  <div className="h-16 w-11 shrink-0 overflow-hidden rounded border border-slate-700 bg-slate-800">
                                    {movie.url_poster ? (
                                      <img src={movie.url_poster} alt={movie.titulo} className="h-full w-full object-cover" onError={handleImageFallback} />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center"><Film className="h-4 w-4 text-white/30" /></div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-extrabold text-white">{movie.titulo}</p>
                                    {movie.sinopsis && (
                                      <p className="mt-0.5 line-clamp-2 text-xs font-medium text-white/50">{movie.sinopsis}</p>
                                    )}
                                  </div>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        );
                      })()}
                    </div>
                    <div className="flex shrink-0 gap-3 border-t border-slate-800 px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setAddMovieToCollectionId(null)}
                        className="flex-1 rounded-lg border border-slate-600 py-2.5 text-sm font-bold text-white/80 transition-colors hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyAddMovies(addMovieToCollectionId)}
                        disabled={pendingMovieIds.size === 0}
                        className="flex-1 rounded-lg bg-[#2a6bb7] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2f77c9] disabled:cursor-not-allowed disabled:bg-slate-700"
                      >
                        {pendingMovieIds.size === 0 ? 'Aplicar' : `Aplicar (${pendingMovieIds.size})`}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {collectionsLoading ? (
                <div className="space-y-3">
                  {collectionSkeletonIds.map((skeletonId) => (
                    <div key={skeletonId} className="h-16 animate-pulse rounded-xl bg-slate-800" />
                  ))}
                </div>
              ) : collections.length > 0 ? (
                <div className="space-y-3">
                  {collections
                    .filter((c) => listFilter.trim() ? (c.titulo_coleccion || '').toLowerCase().includes(listFilter.trim().toLowerCase()) : true)
                    .map((collection) => {
                      const isExpanded = expandedCollectionId === collection.id_coleccion;
                      const movies = collectionMovies[collection.id_coleccion] || [];
                      const isLoadingMovies = collectionMoviesLoading[collection.id_coleccion];
                      const previewPosters = movies.slice(0, 3).map((m) => m.url_poster || FALLBACK_POSTER);

                      return (
                        <div key={collection.id_coleccion} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
                          <div className="flex items-center gap-2 pr-3">
                            <button
                              type="button"
                              onClick={() => handleToggleCollection(collection.id_coleccion)}
                              className="flex flex-1 items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-800/50"
                            >
                              {/* Poster stack preview */}
                              {previewPosters.length > 0 && (
                                <div className="relative shrink-0" style={{ width: `${28 + (previewPosters.length - 1) * 14}px`, height: '42px' }}>
                                  {previewPosters.map((poster, idx) => (
                                    <div
                                      key={`${collection.id_coleccion}-${poster}`}
                                      className="absolute top-0 overflow-hidden rounded border border-slate-700 bg-slate-800 shadow-md"
                                      style={{ left: `${idx * 14}px`, zIndex: previewPosters.length - idx, width: '28px', height: '42px' }}
                                    >
                                      <img src={poster} alt="" className="h-full w-full object-cover" onError={handleImageFallback} />
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-lg font-extrabold text-white">{collection.titulo_coleccion}</p>
                                {collection.descripcion && (
                                  <p className="mt-0.5 truncate text-sm font-semibold text-white/50">{collection.descripcion}</p>
                                )}
                              </div>
                              <ChevronDown className={`h-5 w-5 shrink-0 text-white/50 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            {isOwnProfile && (
                              <button
                                type="button"
                                onClick={() => setDeleteCollectionConfirm({ id: collection.id_coleccion, titulo: collection.titulo_coleccion })}
                                className="shrink-0 rounded-lg p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                title="Eliminar lista"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="border-t border-slate-800 px-5 pb-5 pt-4">
                              {isLoadingMovies ? (
                                <div className="flex gap-3 pb-2">
                                  {collectionMovieSkeletonIds.map((skeletonId) => (
                                    <div key={skeletonId} className="aspect-[2/3] w-28 shrink-0 animate-pulse rounded-md bg-slate-800" />
                                  ))}
                                </div>
                              ) : movies.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                  {movies.map((movie) => (
                                    <div key={`col-movie-${movie.id_pelicula}`} className="group relative">
                                      <button
                                        type="button"
                                        className="aspect-[2/3] w-28 cursor-pointer overflow-hidden rounded-md border border-slate-700 bg-slate-800 text-left transition-transform hover:-translate-y-1 hover:shadow-xl"
                                        title={movie.titulo}
                                        onClick={() => navigate(`/social/pelicula/${movie.id_pelicula}`, { state: { movie: { id: movie.id_pelicula, titulo: movie.titulo, imagenPoster: movie.url_poster } } })}
                                      >
                                        <img src={movie.url_poster || FALLBACK_POSTER} alt={movie.titulo} className="h-full w-full object-cover" onError={handleImageFallback} />
                                      </button>
                                      {isOwnProfile && (
                                        <button
                                          type="button"
                                          onClick={() => setRemoveMovieConfirm({ collectionId: collection.id_coleccion, movieId: movie.id_pelicula, movieTitle: movie.titulo })}
                                          className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white/60 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                                          title="Quitar de la lista"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm font-semibold text-white/50">Esta lista no tiene películas aún.</p>
                              )}
                              {isOwnProfile && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddMovie(collection.id_coleccion)}
                                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-300 transition-colors hover:bg-sky-500/20"
                                >
                                  <Plus className="h-4 w-4" />
                                  Agregar película
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  No hay listas creadas aún.
                </div>
              )}
            </div>
          )}

          {activeTab === 'Reseñas' && (
            <div className="w-full">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-3xl font-extrabold text-slate-100">
                  {reviewsScope === 'following' ? 'Reseñas Following' : 'Reseñas'}
                </h2>
                <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
                  {[
                    { id: 'profile', label: 'Perfil' },
                    { id: 'following', label: 'Following' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setReviewsScope(option.id)}
                      className={`rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${
                        reviewsScope === option.id
                          ? 'bg-sky-500 text-white'
                          : 'text-white/55 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
                  <Search className="h-4 w-4 shrink-0 text-white/40" />
                  <input
                    value={reviewFilter}
                    onChange={(e) => setReviewFilter(e.target.value)}
                    placeholder="Buscar por película..."
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/40"
                  />
                </label>
                {reviewsScope === 'profile' && (
                  <button
                    type="button"
                    onClick={() => setReviewShowOnlyFav((v) => !v)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
                      reviewShowOnlyFav
                        ? 'border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25'
                        : 'border-slate-700 bg-slate-900 text-white/80 hover:bg-slate-800'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${reviewShowOnlyFav ? 'fill-red-400 text-red-400' : ''}`} />
                    {reviewShowOnlyFav ? 'Solo favoritas' : 'Todas'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReviewSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold text-white/80 transition-colors hover:bg-slate-800"
                >
                  <span>★</span>
                  {reviewSort === 'desc' ? 'Mejor calificadas' : 'Peor calificadas'}
                  <ChevronDown className={`h-4 w-4 transition-transform ${reviewSort === 'asc' ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {reviewsLoading ? (
                <div className="space-y-4">
                  {userReviewSkeletonIds.map((skeletonId) => (
                    <div key={skeletonId} className="flex animate-pulse gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                      <div className="h-24 w-16 shrink-0 rounded-md bg-slate-800" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 w-2/3 rounded bg-slate-800" />
                        <div className="h-4 w-1/4 rounded bg-slate-800" />
                        <div className="h-16 rounded bg-slate-800" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : userReviews.length > 0 ? (
                <div className="space-y-4">
                  {userReviews
                    .filter((review) => {
                      const reviewMovieId = getReviewMovieId(review);
                      const isFav = Boolean(interactionsMap[reviewMovieId]?.favorita);
                      if (reviewsScope === 'profile' && reviewShowOnlyFav && !isFav) return false;
                      if (!reviewFilter.trim()) return true;
                      return getReviewMovieTitle(review).toLowerCase().includes(reviewFilter.trim().toLowerCase());
                    })
                    .sort((a, b) => {
                      const aStars = getReviewStars(a);
                      const bStars = getReviewStars(b);
                      return reviewSort === 'desc' ? bStars - aStars : aStars - bStars;
                    })
                    .map((review) => {
                      const reviewId = getReviewId(review);
                      const reviewMovieId = getReviewMovieId(review);
                      const isFav = Boolean(interactionsMap[reviewMovieId]?.favorita);
                      const isExpanded = expandedReviews[reviewId];
                      const stars = getReviewStars(review);
                      const posterUrl = getReviewPoster(review);
                      const movieTitle = getReviewMovieTitle(review);
                      const reviewText = getReviewText(review);
                      const authorName = String(review.usuario || '').replace(/^@/, '');

                      return (
                        <article
                          key={reviewId}
                          className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                        >
                          <button
                            type="button"
                            className="h-24 w-16 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-700 bg-slate-800 transition-transform hover:-translate-y-0.5"
                            onClick={() => navigate(`/social/pelicula/${reviewMovieId}`)}
                          >
                            {posterUrl ? (
                              <img src={posterUrl} alt={movieTitle} className="h-full w-full object-cover" onError={handleImageFallback} />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Film className="h-5 w-5 text-white/30" />
                              </div>
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              className="block max-w-full cursor-pointer truncate text-left text-base font-extrabold text-white transition-colors hover:text-sky-300"
                              onClick={() => navigate(`/social/pelicula/${reviewMovieId}`)}
                            >
                              {movieTitle}
                            </button>
                            {reviewsScope === 'following' && authorName && (
                              <p className="mt-0.5 text-xs font-bold text-sky-300">@{authorName}</p>
                            )}

                            <div className="mt-1 flex items-center gap-2">
                              {reviewsScope === 'profile' && isFav && <Heart className="h-4 w-4 shrink-0 fill-red-500 text-red-500" />}
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }, (_, starIndex) => starIndex + 1).map((starValue) => (
                                  <span key={`star-${reviewId}-${starValue}`} className={`text-sm ${starValue <= stars ? 'text-amber-400' : 'text-white/20'}`}>★</span>
                                ))}
                              </div>
                            </div>

                            <p className={`mt-2 text-sm font-medium leading-relaxed text-white/70 ${!isExpanded ? 'line-clamp-5' : ''}`}>
                              {reviewText || 'Sin comentario.'}
                            </p>

                            {reviewText && reviewText.length > 300 && (
                              <button
                                type="button"
                                onClick={() => setExpandedReviews((prev) => ({ ...prev, [reviewId]: !prev[reviewId] }))}
                                className="mt-1 text-xs font-bold text-sky-400 hover:text-sky-300"
                              >
                                {isExpanded ? 'Mostrar menos' : 'Mostrar más'}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  No hay reseñas publicadas aún.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Social;

