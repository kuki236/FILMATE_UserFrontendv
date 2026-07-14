import { useEffect, useState } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { MapPin, Clock, X } from 'lucide-react';
import { getCinemas } from './filmateApi';

export const Cines = () => {
  const [selectedCine, setSelectedCine] = useState(null);
  const [cinesData, setCinesData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCinemas = async () => {
      try {
        setLoading(true);
        const cinemas = await getCinemas();

        if (!isMounted) return;

        setCinesData(cinemas);
        setError(cinemas.length ? '' : 'No hay cines disponibles en este momento.');
      } catch (err) {
        if (!isMounted) return;

        setCinesData([]);
        setError(err?.message || 'No se pudo cargar el listado de cines.');
        console.error('Error cargando cines:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCinemas();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMapClick = (cine) => {
    setSelectedCine(cine);
  };

  const closeModal = () => {
    setSelectedCine(null);
  };

  const mapSrc = (cine) =>
    cine?.mapa || `https://www.google.com/maps?q=${encodeURIComponent(cine?.direccion || '')}&output=embed`;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />

      <main className="w-full flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <h1 className="mb-8 text-center text-3xl font-bold text-white sm:mb-12 sm:text-4xl">Nuestros locales</h1>

        {error && (
          <div className="mb-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {loading && cinesData.length === 0 ? (
            <div className="text-gray-300">Cargando cines...</div>
          ) : cinesData.length > 0 ? (
            cinesData.map((cine) => (
              <div
                key={cine.id}
                className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition-colors duration-300"
              >
                <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-2 lg:gap-6">
                  <div>
                    <div className="h-56 overflow-hidden rounded-lg bg-slate-800 transition-opacity hover:opacity-80 sm:h-72 lg:h-96">
                      <iframe
                        title={`Mapa de ${cine.nombre}`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen=""
                        referrerPolicy="no-referrer-when-downgrade"
                        src={mapSrc(cine)}
                      ></iframe>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">{cine.nombre}</h2>
                      {cine.estado && (
                        <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-200">
                          {cine.estado}
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <MapPin className="w-6 h-6 text-red-500 mt-1" />
                        </div>
                        <div>
                          <p className="text-slate-300 leading-relaxed">
                            <span className="font-semibold text-white">Dirección:</span> {cine.direccion}
                          </p>
                        </div>
                      </div>
                      {cine.observaciones && (
                        <p className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
                          {cine.observaciones}
                        </p>
                      )}

                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <Clock className="w-6 h-6 text-blue-400 mt-1" />
                        </div>
                        <div>
                          <p className="text-slate-300 leading-relaxed">
                            <span className="font-semibold text-white">Horarios de atención:</span>{' '}
                            {cine.horarios || 'Lunes a Domingo - 10:00 a.m. a 10:00 p.m.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleMapClick(cine)}
                      className="mt-2 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors duration-300 hover:bg-blue-700 sm:mt-4 sm:w-fit sm:py-2"
                    >
                      Ver en Google Maps
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center text-slate-400">
              No hay sedes para mostrar.
            </div>
          )}
        </div>
      </main>

      {selectedCine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="cinema-map-title">
          <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700 bg-slate-800 p-4 sm:p-6">
              <h2 id="cinema-map-title" className="min-w-0 truncate text-lg font-bold text-white sm:text-2xl">{selectedCine.nombre}</h2>
              <button
                onClick={closeModal}
                aria-label="Cerrar mapa"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="h-[52dvh] min-h-64 w-full sm:h-[62dvh]">
              <iframe
                title={`Mapa completo de ${selectedCine.nombre}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen=""
                referrerPolicy="no-referrer-when-downgrade"
                src={mapSrc(selectedCine)}
              ></iframe>
            </div>

            <div className="max-h-40 overflow-y-auto border-t border-slate-700 bg-slate-800 p-4 text-sm sm:p-6 sm:text-base">
              <p className="text-slate-300 mb-2">
                <span className="font-semibold text-white">Dirección:</span> {selectedCine.direccion}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold text-white">Horarios:</span>{' '}
                {selectedCine.horarios || 'Lunes a Domingo - 10:00 a.m. a 10:00 p.m.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Cines;
