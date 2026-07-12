import { useState } from 'react';
import { User, Mail, Lock, IdCard, Phone, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from './filmateApi';
import { clearAuthSession, saveRegisteredSession } from './authSession';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FULL_NAME_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;
const USERNAME_REGEX = /^\w{3,20}$/;
const PHONE_REGEX = /^\d{7,15}$/;
const DOCUMENT_REGEX = /^[A-Za-z0-9]{8,15}$/;
const validateIdentityFields = ({ fullName, username }) => {
  if (!fullName) return 'Completa tu nombre completo.';
  if (!FULL_NAME_REGEX.test(fullName)) {
    return 'El nombre completo solo puede contener letras y espacios.';
  }

  if (!username) return 'El nombre de usuario es obligatorio.';
  if (!USERNAME_REGEX.test(username)) {
    return 'El nombre de usuario debe tener entre 3 y 20 caracteres y solo puede usar letras, números y guion bajo.';
  }

  return '';
};

export const Registro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    nombreUsuario: '',
    email: '',
    numeroDocumento: '',
    contrasena: '',
    telefono: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateForm = () => {
    const fullName = formData.nombreCompleto.trim();
    const username = formData.nombreUsuario.trim();
    const email = formData.email.trim();
    const password = formData.contrasena;
    const documentNumber = formData.numeroDocumento.trim();
    const phone = formData.telefono.trim();

    const identityError = validateIdentityFields({ fullName, username });
    if (identityError) return identityError;

    if (!email) return 'Completa tu correo electrónico.';
    if (!EMAIL_REGEX.test(email)) {
      return 'Ingresa un correo electrónico válido. Ejemplo: nombre@correo.com';
    }

    if (!password) return 'Completa tu contraseña.';
    if (password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (!documentNumber) return 'Completa tu numero de documento.';
    if (!DOCUMENT_REGEX.test(documentNumber)) {
      return 'El documento debe tener entre 8 y 15 caracteres, usando letras o numeros.';
    }

    if (phone) {
      if (!PHONE_REGEX.test(phone)) {
        return 'El teléfono solo puede contener números y debe tener entre 7 y 15 dígitos.';
      }
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
    const numeroDocumento = formData.numeroDocumento.trim();

    try {
      setLoading(true);

      await registerUser({
        nombre: fullName,
        username: nombreUsuario,
        correo,
        contrasena: password,
        id_tipo_doc: 1,
        numero_documento: numeroDocumento,
        telefono,
      });

      let loginResponse = null;
      try {
        loginResponse = await loginUser({ correo, contrasena: password });
      } catch {
        // La cuenta ya fue creada; el usuario podrá iniciar sesión manualmente si falla el auto-login.
      }
      const didAutoLogin = Boolean(loginResponse?.access_token && loginResponse?.user);
      setRequiresLogin(!didAutoLogin);

      if (didAutoLogin) {
        const sessionUser = loginResponse.user;
        saveRegisteredSession({
          ...sessionUser,
          nombre: sessionUser?.nombre || fullName,
          username: sessionUser?.username || nombreUsuario,
          correo: sessionUser?.correo || correo,
          estado: sessionUser?.estado || sessionUser?.estado_usuario || 'ACTIVO',
        }, loginResponse.access_token);
      } else {
        clearAuthSession();
      }

      setShowSuccess(true);

      setTimeout(() => {
        navigate(didAutoLogin ? '/menuPrincipal' : '/');
      }, 2000);
    } catch (err) {
      setError(err?.message || 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:p-6">
      <div className="absolute top-40 left-20 opacity-10 hidden lg:block">
        <img src="/popcorn.png" alt="" className="w-80 h-80 object-contain" />
      </div>
      <div className="absolute bottom-32 right-32 opacity-10 hidden lg:block">
        <img src="/cine.png" alt="" className="w-80 h-80 object-contain" />
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="register-success-title">
          <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 max-w-md w-full mx-4 animate-scaleIn">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                <CheckCircle className="w-20 h-20 text-green-500 relative animate-checkMark" />
              </div>

              <h2 id="register-success-title" className="text-2xl font-bold text-white mb-2 animate-slideDown">
                Registro exitoso
              </h2>
              {requiresLogin ? (
                <p className="text-lg text-gray-300 animate-slideDown animation-delay-200">
                  Tu cuenta fue creada. Te llevaremos al inicio para que ingreses con tus credenciales.
                </p>
              ) : (
                <p className="text-xl text-gray-300 animate-slideDown animation-delay-200">
                  Bienvenido,{' '}
                  <span className="text-red-500 font-semibold">
                    {formData.nombreUsuario || formData.nombreCompleto || 'Usuario'}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl relative z-10">
        <div className="flex justify-center w-full short:w-1/2">
          <img
            src="/favicon.png"
            alt="Filmate Logo"
            className="mx-auto mb-2 h-12 w-12 object-contain sm:mb-0 sm:h-auto sm:w-[8vw]"
          />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className="rounded-3xl border border-slate-700/50 bg-slate-800/50 p-5 shadow-2xl backdrop-blur-xl sm:p-8"
        >
          <h1 className="mb-6 text-center text-2xl font-black text-white sm:mb-8 sm:text-3xl">Crea tu cuenta Filmate</h1>
          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="nombreCompleto" className="flex items-center text-white font-semibold mb-3 text-lg">
                  <User className="w-5 h-5 text-red-500 mr-2" />
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="nombreCompleto"
                  name="nombreCompleto"
                  value={formData.nombreCompleto}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu nombre completo"
                />
              </div>

              <div>
                <label htmlFor="email" className="flex items-center text-white font-semibold mb-3 text-lg">
                  <Mail className="w-5 h-5 text-red-500 mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu correo electrónico"
                />
              </div>

              <div>
                <label htmlFor="contrasena" className="flex items-center text-white font-semibold mb-3 text-lg">
                  <Lock className="w-5 h-5 text-red-500 mr-2" />
                  Contraseña
                </label>
                <input
                  type="password"
                  id="contrasena"
                  name="contrasena"
                  value={formData.contrasena}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu contraseña"
                />
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="nombreUsuario" className="flex items-center text-white font-semibold mb-3 text-lg">
                  <User className="w-5 h-5 text-red-500 mr-2" />
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  id="nombreUsuario"
                  name="nombreUsuario"
                  value={formData.nombreUsuario}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="Ingresa tu nombre de usuario"
                />
              </div>

              <div>
                <label htmlFor="numeroDocumento" className="flex items-center text-white font-semibold mb-3 text-lg">
                  <IdCard className="w-5 h-5 text-red-500 mr-2" />
                  Documento
                </label>
                <input
                  type="text"
                  id="numeroDocumento"
                  name="numeroDocumento"
                  value={formData.numeroDocumento}
                  onChange={handleChange}
                  className="w-full px-4 py-3.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  placeholder="DNI, CE o RUC"
                />
              </div>

              <div>
                <label htmlFor="telefono" className="flex items-center text-white font-semibold mb-3 text-lg">
                  <Phone className="w-5 h-5 text-red-500 mr-2" />
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  id="telefono"
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
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-full transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transform hover:scale-105 text-lg"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </div>

          <p className="text-center mt-6 text-gray-400">
            Ya tienes cuenta?{' '}
            <Link to="/" className="inline-flex min-h-11 items-center px-2 font-semibold text-red-500 transition-colors hover:text-red-400">
              Inicia sesión
            </Link>
          </p>
        </form>
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
    </main>
  );
};

export default Registro;
