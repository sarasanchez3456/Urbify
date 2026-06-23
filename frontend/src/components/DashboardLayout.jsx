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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRight: '1px solid rgba(0, 0, 0, 0.05)', backdropFilter: 'blur(10px)' }}
      >
        <Link to="/dashboard" className="flex items-center gap-3 px-6 py-6" style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
            <span className="text-primary font-bold text-lg" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.40 0.18 255)' }}>U</span>
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.40 0.18 255)' }}>Urbify</span>
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
                  backgroundColor: active ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                  color: active ? 'oklch(0.40 0.18 255)' : 'oklch(0.45 0.03 240)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
                    e.currentTarget.style.color = 'oklch(0.25 0.06 240)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'oklch(0.45 0.03 240)';
                  }
                }}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {usuario?.rol === 'proveedor' && (
          <div className="px-4 pb-6 pt-4" style={{ borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
            <Link
              to="/mis-servicios"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-sm font-medium transition-all"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                color: 'oklch(0.40 0.18 255)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)'; }}
            >
              <Plus size={18} />
              Nuevo Servicio
            </Link>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header
          className="h-16 lg:h-20 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 z-[500] relative"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
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
              <h1 className="text-lg font-semibold hidden sm:block" style={{ fontFamily: "'Playfair Display', serif", color: 'oklch(0.25 0.06 240)' }}>
                {titulo || `Bienvenido, ${usuario?.nombre || 'Usuario'}`}
              </h1>
              {subtitulo && (
                <p className="text-xs hidden sm:block mt-0.5" style={{ color: 'oklch(0.45 0.03 240)' }}>{subtitulo}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative p-2 rounded-full transition-colors"
              style={{ color: 'oklch(0.45 0.03 240)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'; e.currentTarget.style.color = 'oklch(0.25 0.06 240)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'oklch(0.45 0.03 240)'; }}
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: 'oklch(0.40 0.18 255)', boxShadow: '0 0 0 2px white' }} />
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', color: 'oklch(0.40 0.18 255)' }}>
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
