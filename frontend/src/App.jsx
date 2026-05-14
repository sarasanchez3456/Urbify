import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Buscar from './pages/Buscar';
import Mapa from './pages/Mapa';
import ServicioDetalle from './pages/ServicioDetalle';
import SolicitarServicio from './pages/SolicitarServicio';
import Perfil from './pages/Perfil';
import MisServicios from './pages/MisServicios';
import MisSolicitudes from './pages/MisSolicitudes';
import Calificar from './pages/Calificar';

function RutaProtegida({ children, rol }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" />;
  if (rol && usuario.rol !== rol) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/buscar" element={<Buscar />} />
        <Route path="/mapa" element={<Mapa />} />
        <Route path="/servicio/:id" element={<ServicioDetalle />} />
        <Route
          path="/solicitar/:id"
          element={
            <RutaProtegida rol="cliente">
              <SolicitarServicio />
            </RutaProtegida>
          }
        />
        <Route
          path="/perfil"
          element={
            <RutaProtegida>
              <Perfil />
            </RutaProtegida>
          }
        />
        <Route
          path="/mis-servicios"
          element={
            <RutaProtegida rol="proveedor">
              <MisServicios />
            </RutaProtegida>
          }
        />
        <Route
          path="/mis-solicitudes"
          element={
            <RutaProtegida>
              <MisSolicitudes />
            </RutaProtegida>
          }
        />
        <Route
          path="/calificar/:id"
          element={
            <RutaProtegida rol="cliente">
              <Calificar />
            </RutaProtegida>
          }
        />
      </Routes>
    </>
  );
}
