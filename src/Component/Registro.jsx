import React, { useState } from 'react';
import { User, Mail, Lock, MapPin, Phone, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from './filmateApi';
import { saveRegisteredSession } from './authSession';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FULL_NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const PHONE_REGEX = /^[0-9]{7,15}$/;
const REGISTRY_KEY = 'filmate-registered-users';

const readRegistry = () => {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveRegistryEntry = ({ nombreUsuario, telefono, email }) => {
  try {
    const current = readRegistry();
    const next = [
      ...current,
      {
        nombreUsuario: nombreUsuario.trim().toLowerCase(),
        telefono: telefono.trim(),
        email: email.trim().toLowerCase(),
      },
    ];
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(next));
  } catch {
    // Si localStorage falla, el registro sigue funcionando.
  }
};

export const Registro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    nombreUsuario: '',
    email: '',
    direccion: '',
    contrasena: '',
    telefono: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const splitFullName = (value) => {
    const normalized = value.trim().replace(/\s+/g, ' ');
    const parts = normalized.split(' ').filter(Boolean);

    if (parts.length === 0) {
      return { nombres: '', apellidos: '' };
    }

    if (parts.length === 1) {
      return { nombres: parts[0], apellidos: 'Usuario' };
    }

    return {
      nombres: parts.slice(0, -1).join(' '),
      apellidos: parts.slice(-1).join(' '),
    };
  };

  const validateForm = () => {
    const fullName = formData.nombreCompleto.trim();
    const username = formData.nombreUsuario.trim();
    const email = formData.email.trim();
    const password = formData.contrasena;
    const phone = formData.telefono.trim();

    if (!fullName) return 'Completa tu nombre completo.';
    if (!FULL_NAME_REGEX.test(fullName)) {
      return 'El nombre completo solo puede contener letras y espacios.';
    }

    if (!username) return 'El nombre de usuario es obligatorio.';
    if (!USERNAME_REGEX.test(username)) {
      return 'El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede usar letras, números y guion bajo.';
    }

    if (!email) return 'Completa tu correo electrónico.';
    if (!EMAIL_REGEX.test(email)) {
      return 'Ingresa un correo electrónico válido. Ejemplo: nombre@correo.com';
    }

    if (!password) return 'Completa tu contraseña.';
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (phone) {
      if (!PHONE_REGEX.test(phone)) {
        return 'El teléfono solo puede contener números y debe tener entre 7 y 15 dígitos.';
      }
    }

    const registry = readRegistry();
    const normalizedUsername = username.toLowerCase();
    const normalizedPhone = phone;

    if (registry.some((item) => item.nombreUsuario === normalizedUsername)) {
      return 'Ya existe un usuario registrado con ese nombre de usuario.';
    }

    if (phone && registry.some((item) => item.telefono === normalizedPhone)) {
      return 'Ya existe un teléfono registrado con ese número.';
    }

    return '';
  };

  const handleSubmit = async () => {
    setError('');

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const fullName = formData.nombreCompleto.trim();
    const correo = formData.email.trim();
    const password = formData.contrasena;
    const nombreUsuario = formData.nombreUsuario.trim();
    const telefono = formData.telefono.trim();
    const direccion = formData.direccion.trim();
    const { nombres, apellidos } = splitFullName(fullName);

    try {
      setLoading(true);

      const createdUser = await registerUser({
        nombres,
        apellidos,
        correo,
        password,
        nombreUsuario,
        telefono,
        direccion,
      });

      saveRegisteredSession({
        ...createdUser,
        nombres: createdUser?.nombres || nombres,
        apellidos: createdUser?.apellidos || apellidos,
        correo: createdUser?.correo || correo,
        estado: createdUser?.estado || 'Activo',
      });

      saveRegistryEntry({
        nombreUsuario,
        telefono,
        email: correo,
      });

      setShowSuccess(true);

      setTimeout(() => {
        navigate('/menuPrincipal');
      }, 2000);
    } catch (err) {
      setError(err?.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-40 left-20 opacity-10 hidden lg:block">
        <img src="/popcorn.png" alt="" className="w-80 h-80 object-contain" />
      </div>
      <div className="absolute bottom-32 right-32 opacity-10 hidden lg:block">
        <img src="/cine.png" alt="" className="w-80 h-80 object-contain" />
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 max-w-md w-full mx-4 animate-scaleIn">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                <CheckCircle className="w-20 h-20 text-green-500 relative animate-checkMark" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 animate-slideDown">
                Registro exitoso
              </h2>
              <p className="text-xl text-gray-300 animate-slideDown animation-delay-200">
                Bienvenido,{' '}
                <span className="text-red-500 font-semibold">
                  {formData.nombreUsuario || formData.nombreCompleto || 'Usuario'}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl relative z-10">
        <div className="flex justify-center w-full short:w-1/2">
          <img
            src="/favicon.png"
            alt="Filmate Logo"
            className="w-[8vw] mx-auto"
          />
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-700/50">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="flex items-center text-white font-semibold mb-3 text-lg">
                  <User className="w-5 h-5 text-red-500 mr-2" />
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="nombreCompleto"
                  value={formData.nombreCompleto}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu nombre completo"
                />
              </div>

              <div>
                <label className="flex items-center text-white font-semibold mb-3 text-lg">
                  <Mail className="w-5 h-5 text-red-500 mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu correo electrónico"
                />
              </div>

              <div>
                <label className="flex items-center text-white font-semibold mb-3 text-lg">
                  <Lock className="w-5 h-5 text-red-500 mr-2" />
                  Contraseña
                </label>
                <input
                  type="password"
                  name="contrasena"
                  value={formData.contrasena}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu contraseña"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="flex items-center text-white font-semibold mb-3 text-lg">
                  <User className="w-5 h-5 text-red-500 mr-2" />
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  name="nombreUsuario"
                  value={formData.nombreUsuario}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu nombre de usuario"
                />
              </div>

              <div>
                <label className="flex items-center text-white font-semibold mb-3 text-lg">
                  <MapPin className="w-5 h-5 text-red-500 mr-2" />
                  Dirección (opcional)
                </label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu dirección (opcional)"
                />
              </div>

              <div>
                <label className="flex items-center text-white font-semibold mb-3 text-lg">
                  <Phone className="w-5 h-5 text-red-500 mr-2" />
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu teléfono (opcional)"
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-full transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transform hover:scale-105 text-lg"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </div>

          <p className="text-center mt-6 text-gray-400">
            Ya tienes cuenta?{' '}
            <Link to="/">
              <button className="text-red-500 hover:text-red-400 font-semibold transition-colors">
                Inicia sesión
              </button>
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes checkMark {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.5s ease-out;
        }

        .animate-checkMark {
          animation: checkMark 0.6s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.6s ease-out;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};

export default Registro;
