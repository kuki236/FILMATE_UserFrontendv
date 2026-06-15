import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Film, Image, PencilLine, Save, Search, Shuffle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from './Header.jsx';
import { getAuthSession, saveRegisteredSession } from './authSession';
import {
  getMovies,
  getSocialSummary,
  searchMovies,
  updateFavoriteMovies,
  updateSocialProfile,
  updateUserProfile,
} from './filmateApi';

const FALLBACK_POSTER = 'https://placehold.co/400x600/0f172a/f8fafc?text=Filmate';
const MAX_FAVORITES = 5;
const AVATAR_STYLES = ['bottts', 'adventurer', 'notionists', 'micah', 'personas'];

const getUserId = (user) => user?.id_usuario || user?.id || user?.user_id || null;

const getProfileForm = (profile) => ({
  nombre: profile?.nombre || [profile?.nombres, profile?.apellidos].filter(Boolean).join(' ').trim() || '',
  username: profile?.username || profile?.nombreUsuario || '',
  correo: profile?.correo || '',
  telefono: profile?.telefono || '',
  url_perfil: profile?.url_perfil || '',
  bio: profile?.bio || profile?.descripcion || profile?.presentacion || '',
});

const mergeMovies = (current, nextMovies) => {
  const map = new Map(current.map((movie) => [movie.id, movie]));
  nextMovies.forEach((movie) => {
    if (movie?.id) map.set(movie.id, movie);
  });
  return [...map.values()];
};

const createAvatarOptions = () =>
  Array.from({ length: 10 }, (_, index) => {
    const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
    const seed = `filmate-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      id: `${style}-${seed}`,
      label: `Avatar ${index + 1}`,
      url: `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`,
    };
  });

export const SocialEditarPerfil = () => {
  const [session] = useState(() => getAuthSession());
  const sessionUser = session?.user;
  const userId = getUserId(sessionUser);

  const [profile, setProfile] = useState(sessionUser || null);
  const [form, setForm] = useState(() => getProfileForm(sessionUser));
  const [allMovies, setAllMovies] = useState([]);
  const [movieCache, setMovieCache] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [selectedMovieIds, setSelectedMovieIds] = useState([]);
  const [draftMovieIds, setDraftMovieIds] = useState([]);
  const [movieQuery, setMovieQuery] = useState('');
  const [movieSearchLoading, setMovieSearchLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [draftAvatarUrl, setDraftAvatarUrl] = useState('');
  const [profileEditing, setProfileEditing] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState(() => createAvatarOptions());
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');

  useEffect(() => {
    let active = true;

    if (!userId) {
      return () => {
        active = false;
      };
    }

    Promise.allSettled([
      getSocialSummary(userId),
      getMovies({ limit: 50 }),
    ])
      .then(([summaryResult, moviesResult]) => {
        if (!active) return;

        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          const summary = summaryResult.value;
          const nextProfile = summary.profile || sessionUser;
          const nextFavorites = summary.favoriteMovies.slice(0, MAX_FAVORITES);

          setProfile(nextProfile);
          setForm(getProfileForm(nextProfile));
          setFavoriteMovies(nextFavorites);
          setSelectedMovieIds(nextFavorites.map((movie) => movie.id));
          setMovieCache((current) => mergeMovies(current, nextFavorites));
        }

        if (moviesResult.status === 'fulfilled') {
          setAllMovies(moviesResult.value);
          setMovieCache((current) => mergeMovies(current, moviesResult.value));
        }

        const hasFailure = [summaryResult, moviesResult].some(
          (result) => result.status === 'rejected'
        );

        if (hasFailure) {
          setError('No se pudo cargar toda la informacion del perfil.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionUser, userId]);

  useEffect(() => {
    let active = true;

    if (!modalOpen) {
      return () => {
        active = false;
      };
    }

    const normalizedQuery = movieQuery.trim();

    const timer = window.setTimeout(() => {
      if (!active) return;
      setMovieSearchLoading(true);

      const request = normalizedQuery ? searchMovies(normalizedQuery) : getMovies({ limit: 50 });

      request
        .then((movies) => {
          if (!active) return;
          setAllMovies(movies);
          setMovieCache((current) => mergeMovies(current, movies));
        })
        .catch((err) => {
          if (active) setError(err?.message || 'No se pudo buscar peliculas.');
        })
        .finally(() => {
          if (active) setMovieSearchLoading(false);
        });
    }, normalizedQuery ? 300 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [modalOpen, movieQuery]);

  const moviesById = useMemo(() => {
    const entries = [...movieCache, ...allMovies, ...favoriteMovies].map((movie) => [movie.id, movie]);
    return new Map(entries);
  }, [movieCache, allMovies, favoriteMovies]);

  const selectedMovies = useMemo(
    () => selectedMovieIds.map((id) => moviesById.get(id)).filter(Boolean),
    [moviesById, selectedMovieIds]
  );

  const filteredMovies = useMemo(() => {
    const normalizedQuery = movieQuery.trim().toLowerCase();
    const source = allMovies;

    if (!normalizedQuery) return source;

    return source
      .map((movie) => {
        const title = movie.titulo?.toLowerCase() || '';
        const description = (movie.sinopsis || movie.descripcion || '').toLowerCase();
        const secondary = [movie.genero, movie.director, description].filter(Boolean).join(' ').toLowerCase();

        if (title.includes(normalizedQuery)) return { movie, score: 0 };
        if (description.includes(normalizedQuery)) return { movie, score: 1 };
        if (secondary.includes(normalizedQuery)) return { movie, score: 2 };
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.movie.titulo.localeCompare(b.movie.titulo);
      })
      .map((result) => result.movie);
  }, [allMovies, movieQuery]);

  const handleFormChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess('');
  };

  const openAvatarModal = () => {
    if (!profileEditing) return;
    setDraftAvatarUrl(form.url_perfil);
    setAvatarModalOpen(true);
  };

  const refreshAvatarOptions = () => {
    const nextOptions = createAvatarOptions();
    setAvatarOptions(nextOptions);
    setDraftAvatarUrl(nextOptions[0]?.url || '');
  };

  const applyAvatarSelection = () => {
    setFailedAvatarUrl('');
    handleFormChange('url_perfil', draftAvatarUrl);
    setAvatarModalOpen(false);
  };

  const openMovieModal = () => {
    setDraftMovieIds(selectedMovieIds);
    setMovieQuery('');
    setModalOpen(true);
  };

  const toggleDraftMovie = (movieId) => {
    setDraftMovieIds((current) => {
      if (current.includes(movieId)) {
        return current.filter((id) => id !== movieId);
      }

      if (current.length >= MAX_FAVORITES) return current;
      return [...current, movieId];
    });
  };

  const applyMovieSelection = () => {
    setSelectedMovieIds(draftMovieIds);
    setModalOpen(false);
    setSuccess('');
  };

  const removeFavoriteSlot = (movieId) => {
    setSelectedMovieIds((current) => current.filter((id) => id !== movieId));
    setSuccess('');
  };

  const saveChanges = async () => {
    setError('');
    setSuccess('');

    const nombre = form.nombre.trim();
    if (!nombre) {
      setError('El nombre no puede estar vacio.');
      return;
    }

    if (selectedMovieIds.length > MAX_FAVORITES) {
      setError('Solo puedes seleccionar 5 peliculas favoritas.');
      return;
    }

    try {
      setSaving(true);

      const updatedProfile = await updateUserProfile(userId, {
        ...form,
        nombre,
        username: form.username.trim(),
        correo: form.correo.trim(),
        telefono: form.telefono.trim(),
        url_perfil: form.url_perfil.trim(),
      });

      const updatedSocialProfile = await updateSocialProfile(userId, {
        bio: form.bio.trim(),
      });

      await updateFavoriteMovies(userId, selectedMovieIds);

      const mergedProfile = {
        ...updatedProfile,
        bio: updatedSocialProfile?.bio ?? form.bio.trim(),
      };

      const nextSessionUser = {
        ...sessionUser,
        ...mergedProfile,
      };

      saveRegisteredSession(nextSessionUser);
      setProfile(mergedProfile);
      setForm(getProfileForm(mergedProfile));
      setProfileEditing(false);
      setFavoriteMovies(selectedMovies);
      setMovieCache((current) => mergeMovies(current, selectedMovies));
      setSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const avatarPreview = form.url_perfil.trim();
  const displayName = profile?.nombre || sessionUser?.nombre || 'Usuario';

  return (
    <div className="flex min-h-screen flex-col bg-[#020b16] text-white">
      <Header />

      <main className="flex min-h-[calc(100vh-5rem)] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-200/70">Social</p>
              <h1 className="text-3xl font-extrabold text-slate-100 sm:text-4xl">Editar perfil</h1>
            </div>

            <Link
              to="/social"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
              {success}
            </div>
          )}

          <section className="grid flex-1 gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-5">
              <div className="rounded-md border border-slate-800 bg-slate-900/60 p-5">
                <div className="mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-[#211c1f] bg-white text-slate-900">
                  {avatarPreview && failedAvatarUrl !== avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={() => setFailedAvatarUrl(avatarPreview)}
                    />
                  ) : (
                    <Image className="h-14 w-14 text-slate-500" />
                  )}
                </div>

                <p className="mt-5 text-sm font-bold text-white/75">
                  Avatar
                </p>
                <button
                  type="button"
                  onClick={openAvatarModal}
                  disabled={!profileEditing}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2a6bb7] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2f77c9] disabled:cursor-not-allowed disabled:bg-slate-700 disabled:opacity-55"
                >
                  <Image className="h-4 w-4" />
                  Cambiar avatar
                </button>
                <p className="mt-2 text-xs font-semibold text-white/45">
                  Presiona Modificar para cambiar el avatar.
                </p>
              </div>
            </aside>

            <div className="space-y-6">
              <section className="rounded-md border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-extrabold text-white">Informacion del perfil</h2>

                  <button
                    type="button"
                    onClick={() => setProfileEditing((current) => !current)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition-colors ${
                      profileEditing
                        ? 'border border-slate-700 bg-slate-800 hover:bg-slate-700'
                        : 'bg-[#2a6bb7] hover:bg-[#2f77c9]'
                    }`}
                  >
                    <PencilLine className="h-4 w-4" />
                    {profileEditing ? 'Bloquear' : 'Modificar'}
                  </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold text-white/75">Nombre</span>
                    <input
                      value={form.nombre}
                      onChange={(event) => handleFormChange('nombre', event.target.value)}
                      disabled={!profileEditing}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-55"
                      placeholder="Nombre completo"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-white/75">Usuario</span>
                    <input
                      value={form.username}
                      onChange={(event) => handleFormChange('username', event.target.value)}
                      disabled={!profileEditing}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-55"
                      placeholder="usuario"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-white/75">Correo</span>
                    <input
                      value={form.correo}
                      onChange={(event) => handleFormChange('correo', event.target.value)}
                      disabled={!profileEditing}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-55"
                      placeholder="correo@ejemplo.com"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-white/75">Telefono</span>
                    <input
                      value={form.telefono}
                      onChange={(event) => handleFormChange('telefono', event.target.value)}
                      disabled={!profileEditing}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-55"
                      placeholder="999999999"
                    />
                  </label>

                  <label className="block sm:col-span-2">
                    <span className="text-sm font-bold text-white/75">Bio</span>
                    <textarea
                      value={form.bio}
                      onChange={(event) => handleFormChange('bio', event.target.value)}
                      disabled={!profileEditing}
                      rows={4}
                      className="mt-2 w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-55"
                      placeholder="Cuenta algo sobre tu gusto por el cine"
                    />
                  </label>
                </div>
              </section>
              <section className="rounded-md border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Peliculas favoritas</h2>
                    <p className="text-sm font-semibold text-white/55">{selectedMovieIds.length}/5 seleccionadas</p>
                  </div>

                  <button
                    type="button"
                    onClick={openMovieModal}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2a6bb7] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2f77c9]"
                  >
                    <Film className="h-4 w-4" />
                    Editar
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                  {Array.from({ length: MAX_FAVORITES }).map((_, index) => {
                    const movie = selectedMovies[index];

                    return (
                      <div
                        key={movie?.id || index}
                        className="relative aspect-[2/3] overflow-hidden rounded-md border border-slate-800 bg-slate-950"
                      >
                        {movie ? (
                          <>
                            <img
                              src={movie.imagenPoster || FALLBACK_POSTER}
                              alt={movie.titulo}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.src = FALLBACK_POSTER;
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => removeFavoriteSlot(movie.id)}
                              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-600"
                              aria-label={`Quitar ${movie.titulo}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <div className="flex h-full items-center justify-center border border-dashed border-slate-700 text-sm font-bold text-white/35">
                            Vacío
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={loading || saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-5 py-3 text-base font-extrabold text-white shadow-lg shadow-red-950/30 transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-400"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {avatarModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-md border border-slate-700 bg-[#07111f] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <h2 className="text-2xl font-extrabold text-white">Elegir avatar</h2>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshAvatarOptions}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Shuffle className="h-4 w-4" />
                  Aleatorio
                </button>

                <button
                  type="button"
                  onClick={() => setAvatarModalOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-slate-800"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                {avatarOptions.map((avatar) => {
                  const selected = draftAvatarUrl === avatar.url;

                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setDraftAvatarUrl(avatar.url)}
                      className={`relative aspect-square overflow-hidden rounded-md border bg-white p-2 transition ${
                        selected
                          ? 'border-sky-300 shadow-lg shadow-sky-950/40'
                          : 'border-slate-700 hover:border-slate-400'
                      }`}
                      aria-label={avatar.label}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="h-full w-full object-contain"
                      />
                      {selected && (
                        <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyAvatarSelection}
                disabled={!draftAvatarUrl}
                className="rounded-lg bg-[#2a6bb7] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2f77c9] disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                Aplicar avatar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-md border border-slate-700 bg-[#07111f] shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Seleccionar favoritas</h2>
                <p className="text-sm font-semibold text-white/55">{draftMovieIds.length}/5 seleccionadas</p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-slate-800"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-800 px-5 py-4">
              <label className="flex items-center rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                <Search className="h-5 w-5 shrink-0 text-sky-200" />
                <input
                  value={movieQuery}
                  onChange={(event) => setMovieQuery(event.target.value)}
                  className="ml-3 min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/45"
                  placeholder="Buscar pelicula"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {movieSearchLoading && (
                <div className="mb-4 rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white/65">
                  Buscando peliculas en la base de datos...
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {filteredMovies.map((movie) => {
                  const selected = draftMovieIds.includes(movie.id);
                  const disabled = !selected && draftMovieIds.length >= MAX_FAVORITES;

                  return (
                    <button
                      key={movie.id}
                      type="button"
                      onClick={() => toggleDraftMovie(movie.id)}
                      disabled={disabled}
                      className={`group relative overflow-hidden rounded-md border text-left transition ${
                        selected
                          ? 'border-sky-300 shadow-lg shadow-sky-950/40'
                          : 'border-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-45'
                      }`}
                    >
                      <img
                        src={movie.imagenPoster || FALLBACK_POSTER}
                        alt={movie.titulo}
                        className="aspect-[2/3] w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src = FALLBACK_POSTER;
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3">
                        <p className="line-clamp-2 text-sm font-extrabold text-white">{movie.titulo}</p>
                      </div>
                      {selected && (
                        <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {!movieSearchLoading && !filteredMovies.length && (
                <div className="flex min-h-60 items-center justify-center rounded-md border border-dashed border-slate-700 text-center text-sm font-semibold text-white/55">
                  No hay peliculas para mostrar.
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyMovieSelection}
                className="rounded-lg bg-[#2a6bb7] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#2f77c9]"
              >
                Aplicar selección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialEditarPerfil;
