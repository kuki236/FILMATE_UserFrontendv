import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css';
import IniciarSesion from './Component/IniciarSesion.jsx';
import MenuPrincipal from './Component/MenuPrincipal.jsx';
import Registro from './Component/Registro.jsx';
import Cines from './Component/Cines.jsx';
import Dulceria from './Component/Dulceria.jsx';
import Social from './Component/Social.jsx';
import SocialEditarPerfil from './Component/SocialEditarPerfil.jsx';
import DetallePelicula from './Component/DetallePelicula.jsx';
import ProtectedRoute from './Component/ProtectedRoute.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<IniciarSesion />} />
        <Route path="/menuPrincipal" element={<MenuPrincipal />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/cines" element={<Cines />} />
        <Route path="/dulceria" element={<Dulceria />} />
        <Route
          path="/social"
          element={
            <ProtectedRoute requireRegistered>
              <Social />
            </ProtectedRoute>
          }
        />
        <Route
          path="/social/editarPerfil"
          element={
            <ProtectedRoute requireRegistered>
              <SocialEditarPerfil />
            </ProtectedRoute>
          }
        />
        <Route path="/menuPrincipal/detallePelicula/:movieId?" element={<DetallePelicula />} />
      </Routes>
    </Router>
  );
}

export default App;
