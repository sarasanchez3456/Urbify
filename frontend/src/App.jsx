import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Background } from './components/Background';
import { setOnUnauthorized } from './api/axios';

import Home from './pages/Home';
import Auth from './pages/Auth';
import Buscar from './pages/Buscar';
import ServicioDetalle from './pages/ServicioDetalle';
import Perfil from './pages/Perfil';
import MisServicios from './pages/MisServicios';
import MisSolicitudes from './pages/MisSolicitudes';
import MiAgenda from './pages/MiAgenda';
import Verificacion from './pages/Verificacion';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';

const inicioDe = (usuario) => (usuario?.rol === 'admin' ? '/admin' : '/dashboard');

function RutaProtegida({ children, rol }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" />;
  if (rol && usuario.rol !== rol) return <Navigate to="/" />;
  return children;
}

function RedirigirASolicitud() {
  const { id } = useParams();
  return <Navigate to={`/servicio/${id}`} replace />;
}

const rutasDashboard = ['/dashboard', '/admin', '/perfil', '/mis-servicios', '/mis-solicitudes', '/mi-agenda', '/verificacion', '/solicitar', '/calificar', '/buscar', '/mapa', '/servicio'];

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
          <Route path="/" element={usuario ? <Navigate to={inicioDe(usuario)} /> : <Home />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/registro" element={<Auth />} />
          <Route path="/buscar" element={<Buscar />} />
          {/* El mapa ahora vive dentro de Buscar */}
          <Route path="/mapa" element={<Navigate to="/buscar" replace />} />
          <Route path="/servicio/:id" element={<ServicioDetalle />} />
          {/* Solicitar y ver el servicio son un solo flujo: el formulario vive en la página del servicio */}
          <Route path="/solicitar/:id" element={<RedirigirASolicitud />} />
          <Route
            path="/dashboard"
            element={
              <RutaProtegida>
                {usuario?.rol === 'admin' ? <Navigate to="/admin" /> : <Dashboard />}
              </RutaProtegida>
            }
          />
          <Route
            path="/admin"
            element={
              <RutaProtegida rol="admin">
                <AdminPanel />
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
            path="/verificacion"
            element={
              <RutaProtegida rol="proveedor">
                <Verificacion />
              </RutaProtegida>
            }
          />
          <Route
            path="/mi-agenda"
            element={
              <RutaProtegida rol="proveedor">
                <MiAgenda />
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
          {/* Calificar ahora se hace desde el panel de Mis Solicitudes; los enlaces viejos llevan allí */}
          <Route path="/calificar/:id" element={<Navigate to="/mis-solicitudes" replace />} />
        </Routes>
      </main>
    </div>
  );
}
