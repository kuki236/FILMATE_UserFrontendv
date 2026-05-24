import React from 'react';
import Header from './Header.jsx';
import { Search, PencilLine, Star } from 'lucide-react';

const favorites = [
  {
    id: 1,
    title: 'Spider-Man: Across the Spider-Verse',
    image: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600&h=900&fit=crop',
  },
  {
    id: 2,
    title: 'Pulp Fiction',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=900&fit=crop',
  },
  {
    id: 3,
    title: 'Inception',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=900&fit=crop',
  },
  {
    id: 4,
    title: 'Inside Out 2',
    image: 'https://images.unsplash.com/photo-1635187834722-42a3e1f0fbd6?w=600&h=900&fit=crop',
  },
  {
    id: 5,
    title: 'Evangelion',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&h=900&fit=crop',
  },
];

const stats = [
  { value: '35', label: 'Películas' },
  { value: '86', label: 'Siguiendo' },
  { value: '17', label: 'Seguidores' },
];

const tabs = ['Perfil', 'Películas', 'Listas', 'Actividad', 'Reseñas', 'Favoritos'];

export const Social = () => {
  return (
    <div className="min-h-screen bg-[#020b16] text-white flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b border-sky-300/60 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full border-8 border-[#211c1f] bg-white text-slate-900 shadow-xl shadow-black/20 sm:mx-0">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#211c1f] text-white">
                    <span className="text-7xl leading-none">👤</span>
                  </div>
                </div>

                <div className="text-center sm:text-left">
                  <h1 className="text-5xl font-extrabold tracking-tight text-slate-100 sm:text-6xl">
                    Kuki777
                  </h1>

                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#2a6bb7] px-6 py-3 text-xl font-bold text-white transition-colors hover:bg-[#2f77c9]"
                  >
                    <PencilLine className="h-5 w-5" />
                    Editar Perfil
                  </button>
                </div>
              </div>

              <div className="space-y-6 lg:justify-self-end">
                <div className="ml-auto flex w-full max-w-md items-center overflow-hidden rounded-2xl bg-[#2a6bb7] px-4 py-3 shadow-lg shadow-blue-900/20">
                  <Search className="h-7 w-7 text-black" />
                  <span className="ml-4 text-2xl font-bold text-white">Buscar</span>
                </div>

                <div className="grid grid-cols-3 gap-0 text-center">
                  {stats.map((stat, index) => (
                    <div
                      key={stat.label}
                      className={`px-4 ${index !== stats.length - 1 ? 'border-r border-slate-500/80' : ''}`}
                    >
                      <p className="text-6xl font-black leading-none text-[#d8ced0]">{stat.value}</p>
                      <p className="mt-2 text-2xl font-medium text-[#c8c1c1]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-sky-300/60 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-0 md:grid-cols-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`border-x border-slate-800 py-6 text-2xl font-extrabold transition-colors ${
                  tab === 'Películas' ? 'text-slate-100' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-10">
              <div>
                <h2 className="text-3xl font-bold text-white">Bio</h2>
                <div className="mt-3 h-px w-full bg-white/60" />
                <p className="mt-4 text-2xl font-semibold leading-snug text-white">
                  Soy apasionado de las películas, soy muy curioso y me gusta el cine
                </p>
              </div>

              <div>
                <h2 className="text-3xl font-bold text-white">Clasificación Personal</h2>
                <div className="mt-3 h-px w-full bg-white/60" />
                <div className="mt-8 flex items-end gap-2">
                  {[48, 56, 72, 62, 68, 98, 84, 92, 34, 78].map((height, index) => (
                    <div
                      key={index}
                      className="w-6 rounded-t-full bg-[#ff2b50]"
                      style={{ height }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-sm font-bold text-amber-400">
                  <span>★ 1</span>
                  <span>★ 5</span>
                </div>
              </div>
            </aside>

            <div>
              <h2 className="mb-8 text-5xl font-extrabold text-slate-100">Películas Favoritas</h2>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                {favorites.map((movie) => (
                  <article
                    key={movie.id}
                    className="overflow-hidden rounded-md border border-slate-800 bg-slate-900 shadow-xl shadow-black/25 transition-transform hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <img
                      src={movie.image}
                      alt={movie.title}
                      className="h-[380px] w-full object-cover"
                    />
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Social;
