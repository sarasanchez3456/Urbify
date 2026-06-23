import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Background } from './components/Background';
import { setOnUnauthorized } from './api/axios';

import Home from './pages/Home';
import Auth from './pages/Auth';
import Buscar from './pages/Buscar';
import Mapa from './pages/Mapa';
import ServicioDetalle from './pages/ServicioDetalle';
import SolicitarServicio from './pages/SolicitarServicio';
import Perfil from './pages/Perfil';
import MisServicios from './pages/MisServicios';
import MisSolicitudes from './pages/MisSolicitudes';
import Calificar from './pages/Calificar';
import Dashboard from './pages/Dashboard';

function RutaProtegida({ children, rol }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" />;
  if (rol && usuario.rol !== rol) return <Navigate to="/" />;
  return children;
}

const rutasDashboard = ['/dashboard', '/perfil', '/mis-servicios', '/mis-solicitudes', '/solicitar', '/calificar', '/buscar', '/mapa'];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const esDashboard = rutasDashboard.some((r) => location.pathname.startsWith(r)) && !!usuario;
  const isAuth = location.pathname === '/login' || location.pathname === '/registro';

  useEffect(() => {
    setOnUnauthorized(() => navigate('/login'));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[oklch(0.97_0.012_80)] text-[oklch(0.25_0.06_240)] relative overflow-x-hidden">
      <Background />

      {!esDashboard && !isAuth && <Navbar />}

      <main className={`relative z-10 ${!esDashboard && !isAuth ? 'pt-20' : ''}`}>
        <Routes>
          <Route path="/" element={usuario ? <Navigate to="/dashboard" /> : <Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/registro" element={<Auth />} />
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
            path="/dashboard"
            element={
              <RutaProtegida>
                <Dashboard />
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
      </main>
    </div>
  );
}
