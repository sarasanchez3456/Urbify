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
} from 'lucide-react';

export default function DashboardLayout({ children, titulo, subtitulo }) {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard, roles: ['cliente', 'proveedor'] },
    { path: '/perfil', label: 'Mi Perfil', icon: User, roles: ['cliente', 'proveedor'] },
    { path: '/mis-solicitudes', label: usuario?.rol === 'proveedor' ? 'Notificaciones' : 'Mis Solicitudes', icon: ClipboardList, roles: ['cliente', 'proveedor'] },
    { path: '/mis-servicios', label: 'Mis Servicios', icon: Wrench, roles: ['proveedor'] },
    { path: '/buscar', label: 'Buscar Servicios', icon: Search, roles: ['cliente'] },
    { path: '/mapa', label: 'Mapa', icon: MapPin, roles: ['cliente'] },
  ].filter((item) => item.roles.includes(usuario?.rol));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#001718' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: '#001112', borderRight: '1px solid rgba(169, 210, 182, 0.08)' }}
      >
        <Link to="/dashboard" className="flex items-center gap-3 px-6 py-6" style={{ borderBottom: '1px solid rgba(169, 210, 182, 0.06)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(169, 210, 182, 0.12)' }}>
            <span className="text-primary font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif", color: '#a9d2b6' }}>U</span>
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: '#a9d2b6' }}>Urbify</span>
        </Link>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 mx-2 my-1 px-4 py-3 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: active ? 'rgba(169, 210, 182, 0.08)' : 'transparent',
                  color: active ? '#a9d2b6' : 'rgba(193, 200, 193, 0.6)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'rgba(21, 46, 47, 0.6)';
                    e.currentTarget.style.color = '#cde8e8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(193, 200, 193, 0.6)';
                  }
                }}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-6 pt-4" style={{ borderTop: '1px solid rgba(169, 210, 182, 0.06)' }}>
          <Link
            to={usuario?.rol === 'proveedor' ? '/mis-servicios' : '/buscar'}
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-sm font-medium transition-all"
            style={{
              backgroundColor: 'rgba(21, 46, 47, 0.6)',
              border: '1px solid rgba(169, 210, 182, 0.12)',
              color: '#a9d2b6',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(32, 57, 58, 0.8)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(21, 46, 47, 0.6)'; }}
          >
            <Plus size={18} />
            {usuario?.rol === 'proveedor' ? 'Nuevo Servicio' : 'Buscar Servicios'}
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header
          className="h-16 lg:h-20 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 z-30"
          style={{
            backgroundColor: 'rgba(0, 23, 24, 0.82)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(169, 210, 182, 0.06)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'rgba(193, 200, 193, 0.6)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(21, 46, 47, 0.6)'; e.currentTarget.style.color = '#cde8e8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(193, 200, 193, 0.6)'; }}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h1 className="text-lg font-semibold hidden sm:block" style={{ fontFamily: "'Playfair Display', serif", color: '#cde8e8' }}>
                {titulo || `Bienvenido, ${usuario?.nombre || 'Usuario'}`}
              </h1>
              {subtitulo && (
                <p className="text-xs hidden sm:block mt-0.5" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>{subtitulo}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative p-2 rounded-full transition-colors"
              style={{ color: 'rgba(193, 200, 193, 0.6)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(21, 46, 47, 0.6)'; e.currentTarget.style.color = '#cde8e8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(193, 200, 193, 0.6)'; }}
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: '#a9d2b6', boxShadow: '0 0 0 2px #001718' }} />
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(21, 46, 47, 0.6)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(169, 210, 182, 0.12)', color: '#a9d2b6' }}>
                  {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm hidden md:block" style={{ color: '#cde8e8' }}>
                  {usuario?.nombre || 'Usuario'}
                </span>
                <ChevronDown size={16} style={{ color: 'rgba(193, 200, 193, 0.6)' }} className="hidden md:block" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl z-50 py-2 overflow-hidden"
                    style={{
                      backgroundColor: '#001112',
                      border: '1px solid rgba(169, 210, 182, 0.1)',
                      backdropFilter: 'blur(24px)',
                    }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(169, 210, 182, 0.06)' }}>
                      <p className="text-sm font-medium" style={{ color: '#cde8e8' }}>{usuario?.nombre} {usuario?.apellido}</p>
                      <p className="text-xs capitalize" style={{ color: 'rgba(193, 200, 193, 0.5)' }}>{usuario?.rol}</p>
                    </div>
                    <Link
                      to="/perfil"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'rgba(193, 200, 193, 0.6)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(21, 46, 47, 0.6)'; e.currentTarget.style.color = '#cde8e8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(193, 200, 193, 0.6)'; }}
                    >
                      <User size={16} />
                      Mi Perfil
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-left"
                      style={{ color: 'rgba(193, 200, 193, 0.6)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(147, 0, 10, 0.15)'; e.currentTarget.style.color = '#ffb4ab'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(193, 200, 193, 0.6)'; }}
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
