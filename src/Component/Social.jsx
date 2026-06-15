import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header.jsx';
import { PencilLine, Search } from 'lucide-react';
import { getAuthSession } from './authSession';
import {
  getSocialSummary,
  getUserRatedMovies,
  getUserRatingDistribution,
  searchUsers,
} from './filmateApi';

const FALLBACK_POSTER = 'https://placehold.co/400x600/0f172a/f8fafc?text=Filmate';
const DEFAULT_RATING_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

const tabs = ['Perfil', 'Películas', 'Listas', 'Actividad', 'Reseñas', 'Favoritos'];

const getUserId = (user) => user?.id_usuario || user?.id || user?.user_id || null;

const getDisplayName = (user, isRegistered) => {
  if (!isRegistered) return 'Invitado';

  return (
    user?.nombre ||
    [user?.nombres, user?.apellidos].filter(Boolean).join(' ').trim() ||
    user?.username ||
    'Usuario registrado'
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

export const Social = () => {
  const [session] = useState(() => getAuthSession());
  const sessionUser = session?.user;
  const isRegistered = session?.mode === 'registered';
  const userId = getUserId(sessionUser);
  const shouldLoadSocial = Boolean(isRegistered && userId);

  const [profile, setProfile] = useState(sessionUser || null);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [socialStatsData, setSocialStatsData] = useState({
    totalMovies: 0,
    totalReviews: 0,
    followers: 0,
    following: 0,
  });
  const [ratingDistribution, setRatingDistribution] = useState(DEFAULT_RATING_DISTRIBUTION);
  const [ratedMovies, setRatedMovies] = useState([]);
  const [query, setQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');
  const [loading, setLoading] = useState(shouldLoadSocial);
  const [loadError, setLoadError] = useState('');
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');

  useEffect(() => {
    let active = true;

    if (!shouldLoadSocial) {
      return () => {
        active = false;
      };
    }

    Promise.allSettled([
      getSocialSummary(userId),
      getUserRatingDistribution(userId),
      getUserRatedMovies(userId),
    ])
      .then(([summaryResult, ratingResult, ratedMoviesResult]) => {
        if (!active) return;

        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          const summary = summaryResult.value;
          if (summary.profile) setProfile(summary.profile);
          setSocialStatsData(summary.stats);
          setFavoriteMovies(summary.favoriteMovies);
        }

        if (ratingResult.status === 'fulfilled') setRatingDistribution(ratingResult.value);
        if (ratedMoviesResult.status === 'fulfilled') setRatedMovies(ratedMoviesResult.value);

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
    };
  }, [shouldLoadSocial, userId]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    let active = true;

    if (!shouldLoadSocial || normalizedQuery.length < 2) {
      const timer = window.setTimeout(() => {
        if (!active) return;
        setUserSearchResults([]);
        setUserSearchLoading(false);
        setUserSearchError('');
      }, 0);

      return () => {
        active = false;
        window.clearTimeout(timer);
      };
    }

    const timer = window.setTimeout(() => {
      if (!active) return;
      setUserSearchLoading(true);
      setUserSearchError('');

      searchUsers(normalizedQuery)
        .then((results) => {
          if (active) setUserSearchResults(results);
        })
        .catch((error) => {
          if (!active) return;
          setUserSearchResults([]);
          setUserSearchError(error?.message || 'No se pudo buscar usuarios.');
        })
        .finally(() => {
          if (active) setUserSearchLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, shouldLoadSocial]);

  const displayName = getDisplayName(profile || sessionUser, isRegistered);
  const avatarUrl = profile?.url_perfil || sessionUser?.url_perfil || '';
  const ratedMoviesCount = ratedMovies.length || socialStatsData.totalMovies || socialStatsData.totalReviews;
  const bioText = getBioText(profile, isRegistered);
  const hasRealBio = Boolean(profile?.bio || profile?.descripcion || profile?.presentacion);
  const maxRatingCount = Math.max(1, ...Object.values(ratingDistribution).map((value) => Number(value) || 0));
  const totalRatings = Object.values(ratingDistribution).reduce((sum, value) => sum + Number(value || 0), 0);

  const socialStats = [
    { value: formatStat(ratedMoviesCount), label: 'Películas' },
    { value: formatStat(socialStatsData.following), label: 'Siguiendo' },
    { value: formatStat(socialStatsData.followers), label: 'Seguidores' },
  ];

  const handleImageFallback = (event) => {
    event.currentTarget.src = FALLBACK_POSTER;
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#020b16] text-white">
      <Header />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                    {displayName}
                  </h1>

                  <p className="mt-1 text-sm font-medium text-white/55">
                    {isRegistered ? profile?.username || profile?.correo || 'Perfil social' : 'Modo invitado'}
                  </p>

                  <Link
                    to="/social/editarPerfil"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#2a6bb7] px-4 py-2 text-base font-bold text-white transition-colors hover:bg-[#2f77c9]"
                  >
                    <PencilLine className="h-4 w-4" />
                    {isRegistered ? 'Editar Perfil' : 'Modo invitado'}
                  </Link>
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
                      placeholder="Buscar usuarios"
                    />
                  </label>

                  {query.trim().length >= 2 && (
                    <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-md border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40">
                      {userSearchLoading ? (
                        <p className="px-4 py-3 text-sm font-semibold text-white/65">Buscando usuarios...</p>
                      ) : userSearchError ? (
                        <p className="px-4 py-3 text-sm font-semibold text-red-200">{userSearchError}</p>
                      ) : userSearchResults.length > 0 ? (
                        <div className="max-h-72 overflow-y-auto">
                          {userSearchResults.map((user) => (
                            <div key={user.id_usuario || user.id} className="flex items-center gap-3 border-b border-slate-800 px-4 py-3 last:border-b-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                                {user.url_perfil ? (
                                  <img
                                    src={user.url_perfil}
                                    alt={user.nombre || user.username || 'Usuario'}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-black text-white/60">U</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-white">{user.nombre || 'Usuario'}</p>
                                <p className="truncate text-xs font-semibold text-white/50">{user.username || user.correo || 'Perfil social'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="px-4 py-3 text-sm font-semibold text-white/65">Sin usuarios encontrados.</p>
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
                className={`border-x border-slate-800 py-4 text-base font-extrabold transition-colors sm:text-lg ${
                  tab === 'Películas' ? 'text-slate-100' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        <section className="flex min-h-0 flex-1 overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid min-h-0 w-full gap-8 lg:grid-cols-[minmax(240px,0.22fr)_1fr]">
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
                <div className="mt-5 flex min-h-20 items-end gap-1.5">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <div
                      key={rating}
                      className={`w-4 rounded-t-full ${ratingDistribution[rating] ? 'bg-[#ff2b50]' : 'bg-white/20'}`}
                      style={{ height: 12 + (Number(ratingDistribution[rating] || 0) / maxRatingCount) * 64 }}
                      title={`${rating} estrellas: ${ratingDistribution[rating] || 0}`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-sm font-bold text-amber-400">
                  <span>★ 1</span>
                  <span>★ 5</span>
                </div>
                {totalRatings > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-white/55">
                      {totalRatings} calificaciones registradas.
                    </p>
                    {ratedMovies.slice(0, 3).map((item) => (
                      <div key={item.movie?.id || item.movie?.titulo} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-semibold text-white/70">{item.movie?.titulo || 'Pelicula'}</span>
                        <span className="shrink-0 font-black text-amber-400">★ {item.rating}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm font-medium text-white/55">
                    Sin calificaciones disponibles.
                  </p>
                )}
              </div>
            </aside>

            <div className="flex min-h-0 flex-col">
              <h2 className="mb-5 text-3xl font-extrabold text-slate-100">Películas Favoritas</h2>

              {loading ? (
                <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="min-h-[280px] animate-pulse rounded-md border border-slate-800 bg-slate-800/70"
                    />
                  ))}
                </div>
              ) : favoriteMovies.length > 0 ? (
                <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                  {favoriteMovies.map((movie) => (
                    <article
                      key={movie.id}
                      className="group min-h-[280px] overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 transition-transform hover:-translate-y-1 hover:shadow-2xl"
                      title={movie.titulo}
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
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center">
                  <p className="max-w-md text-base font-semibold text-white/65">
                    {query
                      ? 'Usa el buscador superior para encontrar usuarios.'
                      : isRegistered
                        ? 'Aún no tienes películas favoritas registradas.'
                        : 'Inicia sesión para ver tus películas favoritas.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Social;
