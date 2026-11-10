import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  User,
  ClipboardList,
  Wrench,
  Search,
  MapPin,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Plus,
  Home,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';

import NotificationBell from './NotificationBell';
import './DashboardLayout.css';

export default function DashboardLayout({ children, titulo, subtitulo }) {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/admin', label: 'Panel de administración', icon: LayoutDashboard, roles: ['admin'] },
    { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard, roles: ['cliente', 'proveedor'] },
    { path: '/perfil', label: 'Mi Perfil', icon: User, roles: ['cliente', 'proveedor', 'admin'] },
    { path: '/mis-solicitudes', label: usuario?.rol === 'proveedor' ? 'Notificaciones' : 'Mis Solicitudes', icon: ClipboardList, roles: ['cliente', 'proveedor'] },
    { path: '/mis-servicios', label: 'Mis Servicios', icon: Wrench, roles: ['proveedor'] },
    { path: '/mi-agenda', label: 'Mi agenda', icon: CalendarDays, roles: ['proveedor'] },
    { path: '/verificacion', label: 'Verificación', icon: ShieldCheck, roles: ['proveedor'] },
    { path: '/buscar', label: 'Buscar Servicios', icon: Search, roles: ['cliente'] },
  ].filter((item) => item.roles.includes(usuario?.rol));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'transparent' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`dl-aside fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Link to="/dashboard" className="dl-logo">
          <span className="dl-logo-marca" aria-hidden="true">U</span>
          <span className="dl-logo-texto">Urbify</span>
        </Link>

        <nav className="dl-nav" aria-label="Menú principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`dl-nav-link${active ? ' is-on' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {usuario?.rol === 'proveedor' && (
          <div className="dl-pie">
            <Link to="/mis-servicios" onClick={() => setSidebarOpen(false)} className="dl-nuevo">
              <Plus size={18} />
              Nuevo Servicio
            </Link>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="dl-header h-16 lg:h-20 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 z-[500] relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'oklch(0.45 0.03 240)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'; e.currentTarget.style.color = 'oklch(0.25 0.06 240)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'oklch(0.45 0.03 240)'; }}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h1 className="dl-titulo hidden sm:block">
                {titulo || `Bienvenido, ${usuario?.nombre || 'Usuario'}`}
              </h1>
              {subtitulo && (
                <p className="dl-subtitulo hidden sm:block">{subtitulo}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="dl-perfil"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <div className="dl-avatar">
                  {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm hidden md:block" style={{ color: 'oklch(0.25 0.06 240)' }}>
                  {usuario?.nombre || 'Usuario'}
                </span>
                <ChevronDown size={16} style={{ color: 'oklch(0.45 0.03 240)' }} className="hidden md:block" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl z-50 py-2 overflow-hidden"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      backdropFilter: 'blur(24px)',
                    }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                      <p className="text-sm font-medium" style={{ color: 'oklch(0.25 0.06 240)' }}>{usuario?.nombre} {usuario?.apellido}</p>
                      <p className="text-xs capitalize" style={{ color: 'oklch(0.45 0.03 240)' }}>{usuario?.rol}</p>
                    </div>
                    <Link
                      to="/perfil"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'oklch(0.45 0.03 240)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'; e.currentTarget.style.color = 'oklch(0.25 0.06 240)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'oklch(0.45 0.03 240)'; }}
                    >
                      <User size={16} />
                      Mi Perfil
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-left"
                      style={{ color: 'oklch(0.45 0.03 240)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'oklch(0.45 0.03 240)'; }}
                    >
                      <LogOut size={16} />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
