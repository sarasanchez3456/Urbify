import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Lock, Mail, Phone, MapPin, Wrench, ArrowRight, LogIn, UserPlus,
  Zap, Shield, Star, ChevronRight,
} from 'lucide-react';
import './Auth.css';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, registrar } = useAuth();

  const isRegisterPath = location.pathname === '/registro';
  const [isRegister, setIsRegister] = useState(isRegisterPath);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [minutosRestantes, setMinutosRestantes] = useState(0);
  const bloqueadoRef = useRef();

  const [loginCorreo, setLoginCorreo] = useState('');
  const [loginContrasena, setLoginContrasena] = useState('');

  const [regForm, setRegForm] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: '',
    telefono: '',
    direccion: '',
    rol: 'cliente',
    oficio: '',
  });

  useEffect(() => {
    setIsRegister(isRegisterPath);
    setError('');
    setBloqueado(false);
  }, [isRegisterPath]);

  useEffect(() => {
    if (!bloqueado || minutosRestantes <= 0) return;
    bloqueadoRef.current = setInterval(() => {
      setMinutosRestantes((prev) => {
        if (prev <= 1) {
          clearInterval(bloqueadoRef.current);
          setBloqueado(false);
          return 0;
        }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(bloqueadoRef.current);
  }, [bloqueado, minutosRestantes]);

  const handleToggle = () => {
    const next = !isRegister;
    setIsRegister(next);
    setError('');
    setBloqueado(false);
    navigate(next ? '/registro' : '/login', { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setBloqueado(false);
    setCargando(true);
    try {
      await login(loginCorreo, loginContrasena);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      if (data?.bloqueado) {
        setBloqueado(true);
        setMinutosRestantes(data.minutos_restantes || 15);
      }
      setError(data?.error || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await registrar(regForm);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setCargando(false);
    }
  };

  const handleRegChange = (e) => {
    setRegForm({ ...regForm, [e.target.name]: e.target.value });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

        {/* ── LEFT PANEL (decorative) ── */}
        <div className="auth-panel-left">
          <div className="auth-panel-bg" />
          <div className="auth-panel-content">
            <div className="auth-brand" onClick={() => navigate('/')}>URBIFY</div>
            <div className="auth-panel-body">
              <h1 className="auth-panel-title">
                {isRegister ? 'Únete a la comunidad' : 'Bienvenido de nuevo'}
              </h1>
              <p className="auth-panel-desc">
                {isRegister
                  ? 'Miles de profesionales y clientes ya confían en Urbify para conectar servicios urbanos.'
                  : 'Tu hogar merece lo mejor. Accede y encuentra profesionales verificados cerca de ti.'}
              </p>
              <div className="auth-features">
                <div className="auth-feature">
                  <div className="auth-feature-icon"><Shield size={18} /></div>
                  <div>
                    <span className="auth-feature-title">Profesionales verificados</span>
                    <span className="auth-feature-desc">Identidad y experiencia comprobada</span>
                  </div>
                </div>
                <div className="auth-feature">
                  <div className="auth-feature-icon"><Zap size={18} /></div>
                  <div>
                    <span className="auth-feature-title">Respuesta inmediata</span>
                    <span className="auth-feature-desc">Solicita y agenda en minutos</span>
                  </div>
                </div>
                <div className="auth-feature">
                  <div className="auth-feature-icon"><Star size={18} /></div>
                  <div>
                    <span className="auth-feature-title">Calificaciones reales</span>
                    <span className="auth-feature-desc">Reseñas de la comunidad Urbify</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="auth-panel-footer">
              © 2026 Urbify · Servicios Urbanos
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (form) ── */}
        <div className="auth-panel-right">
          <div className="auth-form-wrapper">

            {/* Tab switch */}
            <div className="auth-tab-bar">
              <button
                type="button"
                className={`auth-tab ${!isRegister ? 'active' : ''}`}
                onClick={() => isRegister && handleToggle()}
              >
                <LogIn size={16} />
                Iniciar Sesión
              </button>
              <button
                type="button"
                className={`auth-tab ${isRegister ? 'active' : ''}`}
                onClick={() => !isRegister && handleToggle()}
              >
                <UserPlus size={16} />
                Registrarse
              </button>
            </div>

            {/* Header */}
            <div className="auth-form-header">
              <h2>{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
              <p>{isRegister ? 'Completa tus datos para comenzar' : 'Ingresa con tu correo y contraseña'}</p>
            </div>

            {/* Error / blocked */}
            {bloqueado && !isRegister ? (
              <div className="auth-alert auth-alert-blocked">
                <svg aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" className="auth-alert-icon">
                  <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fillRule="evenodd" />
                </svg>
                <div>
                  <strong>Cuenta bloqueada temporalmente</strong>
                  <span>Intenta de nuevo en {minutosRestantes} minuto{minutosRestantes !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ) : error ? (
              <div className="auth-alert auth-alert-error">
                <span>{error}</span>
              </div>
            ) : null}

            {/* ── LOGIN FORM ── */}
            {!isRegister && (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="auth-field">
                  <label htmlFor="login_email"><Mail size={14} /> Correo electrónico</label>
                  <input
                    id="login_email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={loginCorreo}
                    onChange={(e) => setLoginCorreo(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="login_password"><Lock size={14} /> Contraseña</label>
                  <input
                    id="login_password"
                    type="password"
                    placeholder="••••••••"
                    value={loginContrasena}
                    onChange={(e) => setLoginContrasena(e.target.value)}
                    required
                  />
                </div>

                <button className="auth-submit" type="submit" disabled={cargando}>
                  {cargando ? 'Entrando...' : 'Iniciar Sesión'}
                  <ArrowRight size={16} />
                </button>

                <p className="auth-switch">
                  ¿No tienes cuenta?{' '}
                  <span onClick={handleToggle}>Regístrate aquí</span>
                </p>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {isRegister && (
              <form onSubmit={handleRegister} className="auth-form">
                <div className="auth-row">
                  <div className="auth-field">
                    <label htmlFor="reg_nombre"><User size={14} /> Nombre</label>
                    <input
                      id="reg_nombre"
                      name="nombre"
                      placeholder="Juan"
                      value={regForm.nombre}
                      onChange={handleRegChange}
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reg_apellido"><User size={14} /> Apellido</label>
                    <input
                      id="reg_apellido"
                      name="apellido"
                      placeholder="Pérez"
                      value={regForm.apellido}
                      onChange={handleRegChange}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="reg_email"><Mail size={14} /> Correo electrónico</label>
                  <input
                    id="reg_email"
                    type="email"
                    name="correo"
                    placeholder="tu@correo.com"
                    value={regForm.correo}
                    onChange={handleRegChange}
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="reg_password"><Lock size={14} /> Contraseña</label>
                  <input
                    id="reg_password"
                    type="password"
                    name="contrasena"
                    placeholder="Mínimo 6 caracteres"
                    value={regForm.contrasena}
                    onChange={handleRegChange}
                    required
                    minLength={6}
                  />
                </div>

                <div className="auth-row">
                  <div className="auth-field">
                    <label htmlFor="reg_phone"><Phone size={14} /> Teléfono</label>
                    <input
                      id="reg_phone"
                      name="telefono"
                      placeholder="300 123 4567"
                      value={regForm.telefono}
                      onChange={handleRegChange}
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reg_address"><MapPin size={14} /> Dirección</label>
                    <input
                      id="reg_address"
                      name="direccion"
                      placeholder="Calle, barrio"
                      value={regForm.direccion}
                      onChange={handleRegChange}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label>Tipo de cuenta</label>
                  <div className="auth-role-options">
                    <button
                      type="button"
                      className={`auth-role-btn ${regForm.rol === 'cliente' ? 'active' : ''}`}
                      onClick={() => setRegForm({ ...regForm, rol: 'cliente', oficio: '' })}
                    >
                      <User size={16} />
                      Cliente
                    </button>
                    <button
                      type="button"
                      className={`auth-role-btn ${regForm.rol === 'proveedor' ? 'active' : ''}`}
                      onClick={() => setRegForm({ ...regForm, rol: 'proveedor' })}
                    >
                      <Wrench size={16} />
                      Proveedor
                    </button>
                  </div>
                </div>

                {regForm.rol === 'proveedor' && (
                  <div className="auth-field">
                    <label htmlFor="reg_oficio"><Wrench size={14} /> Oficio</label>
                    <input
                      id="reg_oficio"
                      name="oficio"
                      placeholder="Ej: Electricista, Plomero..."
                      value={regForm.oficio}
                      onChange={handleRegChange}
                      required
                    />
                  </div>
                )}

                <button className="auth-submit" type="submit" disabled={cargando}>
                  {cargando ? 'Registrando...' : 'Crear Cuenta'}
                  <ArrowRight size={16} />
                </button>

                <p className="auth-switch">
                  ¿Ya tienes cuenta?{' '}
                  <span onClick={handleToggle}>Inicia Sesión</span>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
