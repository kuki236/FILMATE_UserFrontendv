import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from './Header.jsx';
import { ChevronDown, Film, Heart, PencilLine, Plus, Search, Trash2, UserCheck, UserPlus, X } from 'lucide-react';
import { getAuthSession } from './authSession';
import {
  API_BASE_URL,
  followUser,
  getFollowing,
  getMovieById,
  getSocialSummary,
  getUserInteractions,
  getUserRatedMovies,
  getUserRatingDistribution,
  searchMovies,
  searchUsers,
} from './filmateApi';

const FALLBACK_POSTER = 'https://placehold.co/400x600/0f172a/f8fafc?text=Filmate';
const DEFAULT_RATING_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

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
  const [favoriteTabMovies, setFavoriteTabMovies] = useState([]);
  const [favoriteTabLoading, setFavoriteTabLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [expandedCollectionId, setExpandedCollectionId] = useState(null);
  const [collectionMovies, setCollectionMovies] = useState({});
  const [collectionMoviesLoading, setCollectionMoviesLoading] = useState({});
  const [userReviews, setUserReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
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
  const [addingMovieIds, setAddingMovieIds] = useState({});
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

    const resetTimer = window.setTimeout(() => {
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
      !isOwnProfile && userId ? getFollowing(userId) : Promise.resolve([]),
    ])
      .then(([summaryResult, ratingResult, ratedMoviesResult, followingResult]) => {
        if (!active) return;

        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          const summary = summaryResult.value;
          if (summary.profile) setProfile(summary.profile);
          setSocialStatsData(summary.stats);
          setFavoriteMovies(summary.favoriteMovies);
        }

        if (ratingResult.status === 'fulfilled') setRatingDistribution(ratingResult.value);
        if (ratedMoviesResult.status === 'fulfilled') setRatedMovies(ratedMoviesResult.value);
        if (followingResult.status === 'fulfilled') {
          setIsFollowing(followingResult.value.some((item) => isSameUser(getRelatedUserId(item), viewedUserId)));
        }

        const hasFailure = [
          summaryResult,
          ratingResult,
          ratedMoviesResult,
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
      window.clearTimeout(resetTimer);
    };
  }, [isOwnProfile, sessionUser, shouldLoadSocial, userId, viewedUserId]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    let active = true;

    if (!shouldLoadSocial || normalizedQuery.length < 2) {
      const timer = window.setTimeout(() => {
        if (!active) return;
        setUserSearchResults([]);
        setMovieSearchResults([]);
        setSearchLoading(false);
        setUserSearchError('');
        setMovieSearchError('');
      }, 0);

      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }

    const timer = window.setTimeout(() => {
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
      window.clearTimeout(timer);
    };
  }, [query, shouldLoadSocial]);

  useEffect(() => {
    if (activeTab !== 'Películas' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    setWatchedLoading(true);

    getUserInteractions(viewedUserId)
      .then((interactions) => {
        if (!active) return;
        const watchedIds = interactions
          .filter((item) => item.vista)
          .map((item) => item.id_pelicula);

        return Promise.all(watchedIds.map((id) => getMovieById(id).catch(() => null)));
      })
      .then((movies) => {
        if (!active) return;
        setWatchedMovies((movies || []).filter(Boolean));
      })
      .catch(() => {
        if (active) setWatchedMovies([]);
      })
      .finally(() => {
        if (active) setWatchedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Favoritos' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    setFavoriteTabLoading(true);

    getUserInteractions(viewedUserId)
      .then((interactions) => {
        if (!active) return;
        const favoriteIds = interactions
          .filter((item) => item.favorita)
          .map((item) => item.id_pelicula);

        return Promise.all(favoriteIds.map((id) => getMovieById(id).catch(() => null)));
      })
      .then((movies) => {
        if (!active) return;
        setFavoriteTabMovies((movies || []).filter(Boolean));
      })
      .catch(() => {
        if (active) setFavoriteTabMovies([]);
      })
      .finally(() => {
        if (active) setFavoriteTabLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Listas' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    setCollectionsLoading(true);

    fetch(`${API_BASE_URL}/client/colecciones/usuario/${viewedUserId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const cols = Array.isArray(data) ? data : [];
        setCollections(cols);

        // Carga inmediata de películas de todas las listas para los previews
        cols.forEach((col) => {
          fetch(`${API_BASE_URL}/client/colecciones/${col.id_coleccion}/peliculas`)
            .then((res) => res.json())
            .then((movies) => {
              if (!active) return;
              setCollectionMovies((prev) => ({
                ...prev,
                [col.id_coleccion]: Array.isArray(movies) ? movies : [],
              }));
            })
            .catch(() => {});
        });
      })
      .catch(() => {
        if (active) setCollections([]);
      })
      .finally(() => {
        if (active) setCollectionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, shouldLoadSocial, viewedUserId]);

  useEffect(() => {
    if (activeTab !== 'Reseñas' || !shouldLoadSocial || !viewedUserId) return;

    let active = true;
    setReviewsLoading(true);

    Promise.all([
      fetch(`${API_BASE_URL}/client/reviews/user/${viewedUserId}`).then((res) => res.json()),
      getUserInteractions(viewedUserId),
    ])
      .then(([reviewsData, interactions]) => {
        if (!active) return;
        const map = {};
        interactions.forEach((item) => {
          map[item.id_pelicula] = item;
        });
        setInteractionsMap(map);

        const reviews = Array.isArray(reviewsData) ? reviewsData : [];
        const movieIds = [...new Set(reviews.map((r) => r.id_pelicula).filter(Boolean))];

        return Promise.all(
          movieIds.map((id) =>
            fetch(`${API_BASE_URL}/client/movies/${id}`)
              .then((res) => res.json())
              .catch(() => null)
          )
        ).then((moviesData) => {
          if (!active) return;
          const moviesById = {};
          moviesData.forEach((m) => {
            if (m && m.id_pelicula) moviesById[m.id_pelicula] = m;
          });
          const enriched = reviews.map((r) => ({
            ...r,
            pelicula: moviesById[r.id_pelicula] || null,
          }));
          setUserReviews(enriched);
        });
      })
      .catch(() => {
        if (active) setUserReviews([]);
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
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

    fetch(`${API_BASE_URL}/client/colecciones/${collectionId}/peliculas`)
      .then((res) => res.json())
      .then((data) => {
        setCollectionMovies((prev) => ({
          ...prev,
          [collectionId]: Array.isArray(data) ? data : [],
        }));
      })
      .catch(() => {
        setCollectionMovies((prev) => ({ ...prev, [collectionId]: [] }));
      })
      .finally(() => {
        setCollectionMoviesLoading((prev) => ({ ...prev, [collectionId]: false }));
      });
  };

  const handleUnfollow = () => {
    if (!userId || !viewedUserId || unfollowLoading) return;

    setUnfollowLoading(true);

    fetch(`${API_BASE_URL}/client/seguidores/dejar-de-seguir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_usuario: userId, id_seguir: viewedUserId }),
    })
      .then(() => {
        setIsFollowing(false);
        setSocialStatsData((currentStats) => ({
          ...currentStats,
          followers: Math.max(0, Number(currentStats.followers || 0) - 1),
        }));
        setShowUnfollowConfirm(false);
      })
      .catch(() => {})
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

    fetch(`${API_BASE_URL}/client/colecciones/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_usuario: Number(userId),
        titulo_coleccion: newListTitle.trim(),
        descripcion: newListDescription.trim() || null,
      }),
    })
      .then((res) => res.json())
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
    fetch(`${API_BASE_URL}/client/colecciones/${collectionId}`, { method: 'DELETE' })
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
      .catch(() => {});
  };

  const handleRemoveMovieFromCollection = (collectionId, movieId) => {
    fetch(`${API_BASE_URL}/client/colecciones/${collectionId}/pelicula/${movieId}`, { method: 'DELETE' })
      .then(() => {
        setCollectionMovies((prev) => ({
          ...prev,
          [collectionId]: (prev[collectionId] || []).filter((m) => m.id_pelicula !== movieId),
        }));
        setRemoveMovieConfirm(null);
      })
      .catch(() => {});
  };

  const handleOpenAddMovie = (collectionId) => {
    setAddMovieToCollectionId(collectionId);
    setAddMovieFilter('');
    setPendingMovieIds(new Set());
    if (allMovies.length > 0) return;

    setAllMoviesLoading(true);
    fetch(`${API_BASE_URL}/client/movies/?limit=200`)
      .then((res) => res.json())
      .then((data) => setAllMovies(Array.isArray(data) ? data : []))
      .catch(() => setAllMovies([]))
      .finally(() => setAllMoviesLoading(false));
  };

  const handleApplyAddMovies = (collectionId) => {
    const toAdd = allMovies.filter((m) => pendingMovieIds.has(m.id_pelicula));
    if (toAdd.length === 0) { setAddMovieToCollectionId(null); return; }

    Promise.all(
      toAdd.map((movie) =>
        fetch(`${API_BASE_URL}/client/colecciones/agregar-pelicula`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_coleccion: collectionId, id_pelicula: movie.id_pelicula }),
        })
          .then(() => ({ id_pelicula: movie.id_pelicula, titulo: movie.titulo, url_poster: movie.url_poster }))
          .catch(() => null)
      )
    ).then((results) => {
      const added = results.filter(Boolean);
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
  const ratedMoviesCount = ratedMovies.length || socialStatsData.totalMovies || socialStatsData.totalReviews;
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
    { value: formatStat(ratedMoviesCount), label: 'Películas' },
    { value: formatStat(socialStatsData.following), label: 'Siguiendo' },
    { value: formatStat(socialStatsData.followers), label: 'Seguidores' },
  ];

  const normalizedSearchQuery = query.trim().toLowerCase();
  const displayedUserSearchResults = normalizedSearchQuery
    ? userSearchResults.filter((user) => String(user.username || '').toLowerCase().includes(normalizedSearchQuery))
    : userSearchResults;
  const displayedMovieSearchResults = movieSearchResults.slice(0, 8);
  const favoriteSlots = Array.from(
    { length: 5 },
    (_, index) => (loading ? null : favoriteMovies[index] || null)
  );

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
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2a6bb7] px-4 py-2 text-base font-bold text-white transition-colors hover:bg-[#2f77c9]"
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
                        {followLoading || unfollowLoading ? 'Cargando...' : isFollowing ? 'Siguiendo' : 'Seguir'}
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
                  {favoriteSlots.map((movie, index) => (
                    movie ? (
                      <article
                        key={`favorite-${movie.id}`}
                        className="group aspect-[2/3] w-full cursor-pointer overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 transition-transform hover:-translate-y-1 hover:shadow-2xl"
                        title={movie.titulo}
                        onClick={() => navigate(`/social/pelicula/${movie.id}`, { state: { movie } })}
                      >
                        <img
                          src={movie.imagenPoster || FALLBACK_POSTER}
                          alt={movie.titulo}
                          className="h-full w-full object-cover"
                          onError={handleImageFallback}
                        />
                      </article>
                    ) : (
                      <div
                        key={`favorite-skeleton-${index}`}
                        className="aspect-[2/3] w-full overflow-hidden rounded-md border border-slate-800 bg-gradient-to-br from-slate-800/90 via-slate-900 to-slate-800/70"
                        aria-label={loading ? 'Cargando película favorita' : 'Espacio de película favorita disponible'}
                      >
                        <div className="h-full w-full bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.04)_45%,transparent_65%)]" />
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Películas' && (
            <div className="w-full">
              <h2 className="mb-5 text-3xl font-extrabold text-slate-100">Películas Vistas</h2>

              {watchedLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`watched-skeleton-${index}`}
                      className="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-md border border-slate-800 bg-slate-800"
                    />
                  ))}
                </div>
              ) : watchedMovies.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {watchedMovies.map((movie) => (
                    <article
                      key={`watched-${movie.id}`}
                      className="group aspect-[2/3] w-36 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 transition-transform hover:-translate-y-1 hover:shadow-2xl"
                      title={movie.titulo}
                      onClick={() => navigate(`/social/pelicula/${movie.id}`, { state: { movie } })}
                    >
                      <img
                        src={movie.imagenPoster || FALLBACK_POSTER}
                        alt={movie.titulo}
                        className="h-full w-full object-cover"
                        onError={handleImageFallback}
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  No hay películas vistas aún.
                </div>
              )}
            </div>
          )}

          {activeTab === 'Favoritos' && (
            <div className="w-full">
              <h2 className="mb-5 text-3xl font-extrabold text-slate-100">Películas Favoritas</h2>

              {favoriteTabLoading ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`fav-skeleton-${index}`}
                      className="aspect-[2/3] w-36 shrink-0 animate-pulse rounded-md border border-slate-800 bg-slate-800"
                    />
                  ))}
                </div>
              ) : favoriteTabMovies.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {favoriteTabMovies.map((movie) => (
                    <article
                      key={`fav-tab-${movie.id}`}
                      className="group aspect-[2/3] w-36 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 transition-transform hover:-translate-y-1 hover:shadow-2xl"
                      title={movie.titulo}
                      onClick={() => navigate(`/social/pelicula/${movie.id}`, { state: { movie } })}
                    >
                      <img
                        src={movie.imagenPoster || FALLBACK_POSTER}
                        alt={movie.titulo}
                        className="h-full w-full object-cover"
                        onError={handleImageFallback}
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-white/60">
                  No hay películas favoritas aún.
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
                        <label className="block text-xs font-bold text-white/60">Nombre *</label>
                        <input
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
                            {pendingMovieIds.size} película{pendingMovieIds.size > 1 ? 's' : ''} seleccionada{pendingMovieIds.size > 1 ? 's' : ''}
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
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex animate-pulse gap-3 rounded-lg bg-slate-800 p-3">
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
                                <li
                                  key={movie.id_pelicula}
                                  className={`flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors ${isSelected ? 'bg-sky-500/10' : 'hover:bg-slate-800/50'}`}
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
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`col-skeleton-${index}`} className="h-16 animate-pulse rounded-xl bg-slate-800" />
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
                                      key={idx}
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
                                  {Array.from({ length: 4 }).map((_, index) => (
                                    <div key={`col-movie-skeleton-${index}`} className="aspect-[2/3] w-28 shrink-0 animate-pulse rounded-md bg-slate-800" />
                                  ))}
                                </div>
                              ) : movies.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                  {movies.map((movie) => (
                                    <div key={`col-movie-${movie.id_pelicula}`} className="group relative">
                                      <article
                                        className="aspect-[2/3] w-28 cursor-pointer overflow-hidden rounded-md border border-slate-700 bg-slate-800 transition-transform hover:-translate-y-1 hover:shadow-xl"
                                        title={movie.titulo}
                                        onClick={() => navigate(`/social/pelicula/${movie.id_pelicula}`, { state: { movie: { id: movie.id_pelicula, titulo: movie.titulo, imagenPoster: movie.url_poster } } })}
                                      >
                                        <img src={movie.url_poster || FALLBACK_POSTER} alt={movie.titulo} className="h-full w-full object-cover" onError={handleImageFallback} />
                                      </article>
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
              <h2 className="mb-5 text-3xl font-extrabold text-slate-100">Reseñas</h2>

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
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`review-skeleton-${index}`} className="flex animate-pulse gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
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
                      const isFav = Boolean(interactionsMap[review.id_pelicula]?.favorita);
                      if (reviewShowOnlyFav && !isFav) return false;
                      if (!reviewFilter.trim()) return true;
                      return (review.pelicula?.titulo || '').toLowerCase().includes(reviewFilter.trim().toLowerCase());
                    })
                    .sort((a, b) => {
                      const aStars = Number(a.puntuacion_estrellas || 0);
                      const bStars = Number(b.puntuacion_estrellas || 0);
                      return reviewSort === 'desc' ? bStars - aStars : aStars - bStars;
                    })
                    .map((review) => {
                      const isFav = Boolean(interactionsMap[review.id_pelicula]?.favorita);
                      const isExpanded = expandedReviews[review.id_resena];
                      const stars = Number(review.puntuacion_estrellas || 0);
                      const posterUrl = review.pelicula?.url_poster || '';
                      const movieTitle = review.pelicula?.titulo || 'Película';

                      return (
                        <article
                          key={review.id_resena}
                          className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                        >
                          <div
                            className="h-24 w-16 shrink-0 cursor-pointer overflow-hidden rounded-md border border-slate-700 bg-slate-800 transition-transform hover:-translate-y-0.5"
                            onClick={() => navigate(`/social/pelicula/${review.id_pelicula}`)}
                          >
                            {posterUrl ? (
                              <img src={posterUrl} alt={movieTitle} className="h-full w-full object-cover" onError={handleImageFallback} />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Film className="h-5 w-5 text-white/30" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className="cursor-pointer truncate text-base font-extrabold text-white transition-colors hover:text-sky-300"
                              onClick={() => navigate(`/social/pelicula/${review.id_pelicula}`)}
                            >
                              {movieTitle}
                            </p>

                            <div className="mt-1 flex items-center gap-2">
                              {isFav && <Heart className="h-4 w-4 shrink-0 fill-red-500 text-red-500" />}
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, index) => (
                                  <span key={index} className={`text-sm ${index < stars ? 'text-amber-400' : 'text-white/20'}`}>★</span>
                                ))}
                              </div>
                            </div>

                            <p className={`mt-2 text-sm font-medium leading-relaxed text-white/70 ${!isExpanded ? 'line-clamp-5' : ''}`}>
                              {review.comentario}
                            </p>

                            {review.comentario && review.comentario.length > 300 && (
                              <button
                                type="button"
                                onClick={() => setExpandedReviews((prev) => ({ ...prev, [review.id_resena]: !prev[review.id_resena] }))}
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
