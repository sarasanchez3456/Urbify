import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SmokeyBackground } from '../components/ui/smokey-background';
import {
  User, Lock, Mail, Phone, MapPin, Wrench, ArrowRight, LogIn, UserPlus,
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
    setIsRegister(!isRegister);
    setError('');
    setBloqueado(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setBloqueado(false);
    setCargando(true);
    try {
      const user = await login(loginCorreo, loginContrasena);
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
      const user = await registrar(regForm);
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
    <div className="auth-container">
      <SmokeyBackground color="#a9d2b6" />

      <div className="auth-form" style={{ transform: isRegister ? 'rotateY(-180deg)' : 'rotateY(0deg)' }}>
        {/* === LOGIN === */}
        <div className={`form-face form-front ${bloqueado ? 'has-blocked' : ''}`}>
          <div className="form-header">
            <div className="form-icon">
              <LogIn size={20} />
            </div>
            <h2 className="form-title">Iniciar Sesión</h2>
            <p className="form-subtitle">Bienvenido de nuevo</p>
          </div>

          {bloqueado ? (
            <div className="blocked-box">
              <svg aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="blocked-icon">
                <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fillRule="evenodd"></path>
              </svg>
              <div className="blocked-text">
                <p className="blocked-heading">Cuenta bloqueada temporalmente</p>
                <p>Demasiados intentos fallidos. Intenta de nuevo en {minutosRestantes} minuto{minutosRestantes !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ) : error && (
            <div className="error-box">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-inner-form">
            <div className="floating-input-group">
              <input
                id="login_email"
                type="email"
                className="floating-input peer"
                placeholder=" "
                value={loginCorreo}
                onChange={(e) => setLoginCorreo(e.target.value)}
                required
              />
              <label htmlFor="login_email" className="floating-label">
                <Mail size={15} className="floating-icon" />
                Correo electrónico
              </label>
            </div>

            <div className="floating-input-group">
              <input
                id="login_password"
                type="password"
                className="floating-input peer"
                placeholder=" "
                value={loginContrasena}
                onChange={(e) => setLoginContrasena(e.target.value)}
                required
              />
              <label htmlFor="login_password" className="floating-label">
                <Lock size={15} className="floating-icon" />
                Contraseña
              </label>
            </div>

            <button className="auth-btn" type="submit" disabled={cargando}>
              {cargando ? 'Entrando...' : 'Iniciar Sesión'}
              <ArrowRight size={16} className="btn-icon" />
            </button>
          </form>

          <p className="switch-text">
            ¿No tienes cuenta?{' '}
            <span onClick={handleToggle} className="switch-link">
              Regístrate
            </span>
          </p>
        </div>

        {/* === REGISTER === */}
        <div className="form-face form-back">
          <div className="form-header">
            <div className="form-icon">
              <UserPlus size={20} />
            </div>
            <h2 className="form-title">Crear Cuenta</h2>
            <p className="form-subtitle">Únete a Urbify</p>
          </div>

          {error && (
            <div className="error-box">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="auth-inner-form">
            <div className="reg-row">
              <div className="floating-input-group reg-half">
                <input
                  id="reg_nombre"
                  name="nombre"
                  className="floating-input peer"
                  placeholder=" "
                  value={regForm.nombre}
                  onChange={handleRegChange}
                  required
                />
                <label htmlFor="reg_nombre" className="floating-label">
                  <User size={15} className="floating-icon" />
                  Nombre
                </label>
              </div>
              <div className="floating-input-group reg-half">
                <input
                  id="reg_apellido"
                  name="apellido"
                  className="floating-input peer"
                  placeholder=" "
                  value={regForm.apellido}
                  onChange={handleRegChange}
                  required
                />
                <label htmlFor="reg_apellido" className="floating-label">
                  <User size={15} className="floating-icon" />
                  Apellido
                </label>
              </div>
            </div>

            <div className="floating-input-group">
              <input
                id="reg_email"
                type="email"
                name="correo"
                className="floating-input peer"
                placeholder=" "
                value={regForm.correo}
                onChange={handleRegChange}
                required
              />
              <label htmlFor="reg_email" className="floating-label">
                <Mail size={15} className="floating-icon" />
                Correo electrónico
              </label>
            </div>

            <div className="floating-input-group">
              <input
                id="reg_password"
                type="password"
                name="contrasena"
                className="floating-input peer"
                placeholder=" "
                value={regForm.contrasena}
                onChange={handleRegChange}
                required
                minLength={6}
              />
              <label htmlFor="reg_password" className="floating-label">
                <Lock size={15} className="floating-icon" />
                Contraseña (mín. 6 caracteres)
              </label>
            </div>

            <div className="floating-input-group">
              <input
                id="reg_phone"
                name="telefono"
                className="floating-input peer"
                placeholder=" "
                value={regForm.telefono}
                onChange={handleRegChange}
              />
              <label htmlFor="reg_phone" className="floating-label">
                <Phone size={15} className="floating-icon" />
                Teléfono
              </label>
            </div>

            <div className="floating-input-group">
              <input
                id="reg_address"
                name="direccion"
                className="floating-input peer"
                placeholder=" "
                value={regForm.direccion}
                onChange={handleRegChange}
              />
              <label htmlFor="reg_address" className="floating-label">
                <MapPin size={15} className="floating-icon" />
                Dirección
              </label>
            </div>

            <div className="role-selector">
              <span className="role-label">Tipo de cuenta</span>
              <div className="role-options">
                <button
                  type="button"
                  className={`role-btn ${regForm.rol === 'cliente' ? 'active' : ''}`}
                  onClick={() => setRegForm({ ...regForm, rol: 'cliente', oficio: '' })}
                >
                  <User size={16} />
                  Cliente
                </button>
                <button
                  type="button"
                  className={`role-btn ${regForm.rol === 'proveedor' ? 'active' : ''}`}
                  onClick={() => setRegForm({ ...regForm, rol: 'proveedor' })}
                >
                  <Wrench size={16} />
                  Proveedor
                </button>
              </div>
            </div>

            {regForm.rol === 'proveedor' && (
              <div className="floating-input-group">
                <input
                  id="reg_oficio"
                  name="oficio"
                  className="floating-input peer"
                  placeholder=" "
                  value={regForm.oficio}
                  onChange={handleRegChange}
                  required
                />
                <label htmlFor="reg_oficio" className="floating-label">
                  <Wrench size={15} className="floating-icon" />
                  Ej: Electricista, Plomero, Mecánico...
                </label>
              </div>
            )}

            <button className="auth-btn" type="submit" disabled={cargando}>
              {cargando ? 'Registrando...' : 'Crear Cuenta'}
              <ArrowRight size={16} className="btn-icon" />
            </button>
          </form>

          <p className="switch-text">
            ¿Ya tienes cuenta?{' '}
            <span onClick={handleToggle} className="switch-link">
              Inicia Sesión
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
