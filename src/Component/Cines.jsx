import React, { useState } from 'react';
import Header from './Header.jsx';
import { MapPin, Clock, X } from 'lucide-react';

const cinesData = [
  {
    id: 1,
    nombre: 'Cinemark Jirón de la Unión',
    direccion: 'Jr. de la Unión 870, Cercado de Lima, Lima, Perú',
    horarios: 'Lunes a Domingo – 10:00 a.m. a 10:00 p.m.',
    coordenadas: '-12.0464,-77.0283',
    mapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.3549923756926!2d-77.02829!3d-12.04638!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105c8b7d5c5c5c5%3A0x5c5c5c5c5c5c5c5c!2sJr.%20de%20la%20Uni%C3%B3n%20870%2C%20Cercado%20de%20Lima!5e0!3m2!1ses!2spe!4v1234567890'
  },
  {
    id: 2,
    nombre: 'Cinemark La Molina',
    direccion: 'Av. La Molina 1234, La Molina, Lima, Perú',
    horarios: 'Lunes a Domingo – 10:00 a.m. a 10:00 p.m.',
    coordenadas: '-12.0968,-76.7591',
    mapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.2184758889977!2d-76.7591!3d-12.0968!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105d50e5c5c5c5d%3A0x5c5c5c5c5c5c5c5c!2sAv.%20La%20Molina%201234%2C%20La%20Molina!5e0!3m2!1ses!2spe!4v1234567890'
  },
  {
    id: 3,
    nombre: 'Cineplex Miraflores',
    direccion: 'Av. Larco 123, Miraflores, Lima, Perú',
    horarios: 'Lunes a Domingo – 10:00 a.m. a 10:00 p.m.',
    coordenadas: '-12.1264,-77.0273',
    mapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.1234567890!2d-77.0273!3d-12.1264!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105b5e5c5c5c5c5%3A0x5c5c5c5c5c5c5c5c!2sAv.%20Larco%20123%2C%20Miraflores!5e0!3m2!1ses!2spe!4v1234567890'
  },
  {
    id: 4,
    nombre: 'Cineplanet San Miguel',
    direccion: 'Av. Universitaria 5678, San Miguel, Lima, Perú',
    horarios: 'Lunes a Domingo – 10:00 a.m. a 10:00 p.m.',
    coordenadas: '-12.0667,-77.0867',
    mapsUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.0987654321!2d-77.0867!3d-12.0667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105c2e5c5c5c5c5%3A0x5c5c5c5c5c5c5c5c!2sAv.%20Universitaria%205678%2C%20San%20Miguel!5e0!3m2!1ses!2spe!4v1234567890'
  }
];

export const Cines = () => {
  const [selectedCine, setSelectedCine] = useState(null);

  const handleMapClick = (cine) => {
    setSelectedCine(cine);
  };

  const closeModal = () => {
    setSelectedCine(null);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      
      {/* Contenido Principal */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white text-center mb-12">Nuestros locales</h1>
        
        <div className="space-y-8">
          {cinesData.map((cine) => (
            <div 
              key={cine.id}
              className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition-colors duration-300"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                
                {/* Mapa */}
                <div className="cursor-pointer" onClick={() => handleMapClick(cine)}>
                  <div className="bg-slate-800 rounded-lg overflow-hidden h-64 hover:opacity-80 transition-opacity">
                    <iframe
                      title={`Mapa de ${cine.nombre}`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen=""
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(cine.direccion)}`}
                    ></iframe>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">Haz click en el mapa para ver en Google Maps</p>
                </div>

                {/* Información */}
                <div className="flex flex-col justify-center space-y-6">
                  <h2 className="text-2xl font-bold text-white">{cine.nombre}</h2>
                  
                  <div className="space-y-4">
                    {/* Dirección */}
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

                    {/* Horarios */}
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <Clock className="w-6 h-6 text-blue-400 mt-1" />
                      </div>
                      <div>
                        <p className="text-slate-300 leading-relaxed">
                          <span className="font-semibold text-white">Horarios de atención:</span> {cine.horarios}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botón Ver en Mapa */}
                  <button
                    onClick={() => handleMapClick(cine)}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-300 w-fit"
                  >
                    Ver en Google Maps
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal con Google Maps */}
      {selectedCine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700">
            
            {/* Header del Modal */}
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800">
              <h2 className="text-2xl font-bold text-white">{selectedCine.nombre}</h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Google Maps */}
            <div className="w-full h-[70vh]">
              <iframe
                title={`Mapa completo de ${selectedCine.nombre}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen=""
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(selectedCine.direccion)}`}
              ></iframe>
            </div>

            {/* Footer del Modal con información */}
            <div className="p-6 bg-slate-800 border-t border-slate-700">
              <p className="text-slate-300 mb-2"><span className="font-semibold text-white">Dirección:</span> {selectedCine.direccion}</p>
              <p className="text-slate-300"><span className="font-semibold text-white">Horarios:</span> {selectedCine.horarios}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cines;
