import { useEffect, useState } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { MapPin, Clock, X } from 'lucide-react';
import { getCinemas } from './filmateApi';

const fallbackCines = [
  {
    id: 1,
    nombre: 'Filmate Jirón de la Unión',
    direccion: 'Jr. de la Unión 870, Cercado de Lima, Lima, Perú',
    horarios: 'Lunes a Domingo - 10:00 a.m. a 10:00 p.m.',
  },
];

export const Cines = () => {
  const [selectedCine, setSelectedCine] = useState(null);
  const [cinesData, setCinesData] = useState(fallbackCines);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCinemas = async () => {
      try {
        setLoading(true);
        const cinemas = await getCinemas();

        if (!isMounted) return;

        if (cinemas.length > 0) {
          setCinesData(cinemas);
          setError('');
        } else {
          setCinesData(fallbackCines);
          setError('La API no devolvió cines, se muestran datos locales.');
        }
      } catch (err) {
        if (!isMounted) return;

        setCinesData(fallbackCines);
        setError('No se pudo conectar con el backend, se muestran datos locales.');
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

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white text-center mb-12">Nuestros locales</h1>

        {error && (
          <div className="mb-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {loading && cinesData.length === 0 ? (
            <div className="text-gray-300">Cargando cines...</div>
          ) : (
            cinesData.map((cine) => (
              <div
                key={cine.id}
                className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition-colors duration-300"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                  <div className="cursor-pointer" onClick={() => handleMapClick(cine)}>
                    <div className="bg-slate-800 rounded-lg overflow-hidden h-96 hover:opacity-80 transition-opacity">
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
                    <h2 className="text-2xl font-bold text-white">{cine.nombre}</h2>

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
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-300 w-fit"
                    >
                      Ver en Google Maps
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedCine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800">
              <h2 className="text-2xl font-bold text-white">{selectedCine.nombre}</h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="w-full h-[70vh]">
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

            <div className="p-6 bg-slate-800 border-t border-slate-700">
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
