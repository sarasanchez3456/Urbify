import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { logError } from '../utils/log';
import './Perfil.css';

const CAMPOS = ['nombre', 'apellido', 'telefono', 'direccion'];
const ETIQUETAS = { nombre: 'nombre', apellido: 'apellido', telefono: 'teléfono', direccion: 'dirección' };
const ROLES = { cliente: 'Cliente', proveedor: 'Proveedor', admin: 'Administrador' };
const VACIO = { nombre: '', apellido: '', telefono: '', direccion: '' };

// Misma regla que el backend (utils/telefono.js): solo dígitos, "+" inicial opcional, de 7 a 15 dígitos.
// Los espacios se aceptan al escribir y se ignoran al validar.
const TELEFONO_VALIDO = /^\+?\d{7,15}$/;

// Devuelve el mensaje de error del teléfono, o '' si es válido (o está vacío y no había uno guardado).
// El backend ignora un teléfono vacío (no lo borra), por eso no se deja vaciar uno que ya existe:
// la pantalla diría "guardado" y el número volvería solo.
function mensajeTelefono(valor, teniaTelefono) {
  const limpio = valor.replace(/\s+/g, '');
  if (!limpio) {
    return teniaTelefono ? 'No se puede dejar vacío. Si quieres cambiarlo, escribe el número nuevo.' : '';
  }
  if (/[^\d+]/.test(limpio) || limpio.indexOf('+', 1) !== -1) {
    return 'Solo se permiten números. Quita las letras o símbolos para poder guardar.';
  }
  return TELEFONO_VALIDO.test(limpio) ? '' : 'El teléfono debe tener de 7 a 15 números.';
}

const desdeUsuario = (u) => ({
  nombre: u.nombre || '',
  apellido: u.apellido || '',
  telefono: u.telefono ? String(u.telefono) : '',
  direccion: u.direccion || '',
});

function formatearMiembroDesde(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  // Ej.: "agosto de 2026" → "Agosto de 2026" (solo la primera letra en mayúscula).
  const texto = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function Perfil() {
  const { usuario } = useAuth();
  const rol = usuario?.rol;

  const [form, setForm] = useState(VACIO);
  const [guardado, setGuardado] = useState(VACIO); // lo que hay en el servidor, para detectar cambios
  const [cuenta, setCuenta] = useState({ correo: '', fecha_creacion: null });
  const [resumen, setResumen] = useState(null);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const [aviso, setAviso] = useState('');
  const [avisoTel, setAvisoTel] = useState('');
  const temporizadorAviso = useRef(null);
  const temporizadorTel = useRef(null);
  const telefonoRef = useRef(null);

  const cargarPerfil = useCallback(() => {
    setEstado('cargando');
    api.get('/auth/perfil')
      .then((res) => {
        const u = res.data;
        setForm(desdeUsuario(u));
        setGuardado(desdeUsuario(u));
        setCuenta({ correo: u.correo || '', fecha_creacion: u.fecha_creacion || null });
        setEstado('listo');
      })
      .catch((err) => {
        logError('Error al cargar perfil:', err);
        setEstado('error');
      });
  }, []);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  // Resumen de actividad (solo clientes y proveedores; el administrador no tiene solicitudes propias).
  useEffect(() => {
    if (rol !== 'cliente' && rol !== 'proveedor') return undefined;
    let cancelado = false;
    api.get(rol === 'cliente' ? '/solicitudes/cliente' : '/solicitudes/proveedor')
      .then((res) => {
        if (cancelado) return;
        const lista = Array.isArray(res.data) ? res.data : [];
        setResumen({ total: lista.length, completadas: lista.filter((s) => s.estado === 'completada').length });
      })
      .catch((err) => logError('Error al cargar el resumen de la cuenta:', err));
    return () => {
      cancelado = true;
    };
  }, [rol]);

  useEffect(() => () => {
    clearTimeout(temporizadorAviso.current);
    clearTimeout(temporizadorTel.current);
  }, []);

  const errorTelefono = useMemo(
    () => mensajeTelefono(form.telefono, guardado.telefono.trim() !== ''),
    [form.telefono, guardado.telefono]
  );
  const nombreVacio = form.nombre.trim() === '';
  const apellidoVacio = form.apellido.trim() === '';
  const modificado = CAMPOS.some((c) => form[c] !== guardado[c]);
  const puedeGuardar = modificado && !errorTelefono && !nombreVacio && !apellidoVacio && !guardando;

  const faltan = CAMPOS.filter((c) => form[c].trim() === '').map((c) => ETIQUETAS[c]);
  const porcentaje = Math.round(((CAMPOS.length - faltan.length) / CAMPOS.length) * 100);

  const cambiar = (campo) => (e) => {
    const valor = e.target.value;
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrorGuardar('');
  };

  // Al teclear en el teléfono las letras no aparecen. Se usa el evento nativo "beforeinput" (React no lo
  // expone) porque también se dispara con teclados móviles y métodos de entrada, no solo con teclas físicas.
  // Si el texto llega de otra forma (pegar), queda a la vista con su error y el botón de guardar se apaga.
  const avisarSoloNumeros = useCallback(() => {
    setAvisoTel('Este campo solo acepta números.');
    clearTimeout(temporizadorTel.current);
    temporizadorTel.current = setTimeout(() => setAvisoTel(''), 1600);
  }, []);

  useEffect(() => {
    const campo = telefonoRef.current;
    if (!campo) return undefined;
    const alEscribir = (e) => {
      if (e.inputType === 'insertText' && e.data && /[^\d\s+]/.test(e.data)) {
        e.preventDefault();
        avisarSoloNumeros();
      }
    };
    campo.addEventListener('beforeinput', alEscribir);
    return () => campo.removeEventListener('beforeinput', alEscribir);
  }, [estado, avisarSoloNumeros]);

  const mostrarAviso = (texto) => {
    setAviso(texto);
    clearTimeout(temporizadorAviso.current);
    temporizadorAviso.current = setTimeout(() => setAviso(''), 2800);
  };

  const descartar = () => {
    setForm(guardado);
    setErrorGuardar('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeGuardar) return;
    setGuardando(true);
    setErrorGuardar('');
    try {
      const res = await api.put('/auth/perfil', {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        telefono: form.telefono.trim(),
        direccion: form.direccion.trim(),
      });
      // El servidor devuelve el perfil guardado (con el teléfono normalizado): es la fuente de verdad.
      const u = res.data?.usuario;
      const nuevo = u
        ? desdeUsuario(u)
        : {
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            telefono: form.telefono.trim(),
            direccion: form.direccion.trim(),
          };
      setForm(nuevo);
      setGuardado(nuevo);
      mostrarAviso('Perfil actualizado');
    } catch (err) {
      logError('Error al actualizar perfil:', err);
      setErrorGuardar(err.response?.data?.error || 'No se pudo guardar el perfil. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const textoErrorTel = errorTelefono || avisoTel;
  const inicial = form.nombre.trim().charAt(0).toUpperCase() || 'U';
  const nombreCompleto = `${form.nombre} ${form.apellido}`.trim() || 'Tu nombre';

  return (
    <DashboardLayout titulo="Mi Perfil" subtitulo="Administra tu información personal">
      <div className="pf">
        {estado === 'cargando' && <div className="pf-card pf-estado">Cargando...</div>}

        {estado === 'error' && (
          <div className="pf-card pf-estado" role="alert">
            <p>No se pudo cargar tu perfil.</p>
            <button type="button" className="pf-btn" onClick={cargarPerfil}>Reintentar</button>
          </div>
        )}

        {estado === 'listo' && (
          <form className="pf-grid" onSubmit={handleSubmit} noValidate>
            <div>
              <div className="pf-card">
                <div className="pf-head">
                  <div className="pf-avatar" aria-hidden="true">{inicial}</div>
                  <div>
                    <h2 className="pf-name">{nombreCompleto}</h2>
                    {rol && <span className="pf-role">{ROLES[rol] || rol}</span>}
                  </div>
                </div>

                <div className="pf-progress">
                  <div className="pf-progress-top">
                    <span>Tu perfil está al <b>{porcentaje}%</b></span>
                  </div>
                  <div className="pf-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} aria-label="Perfil completado">
                    <i style={{ width: `${porcentaje}%` }} />
                  </div>
                  <p>{faltan.length ? `Te falta: ${faltan.join(', ')}.` : 'Tienes todos tus datos completos.'}</p>
                </div>

                {errorGuardar && <div className="pf-alert" role="alert">{errorGuardar}</div>}

                <section className="pf-sec">
                  <h3>Datos personales</h3>
                  <p className="pf-sd">Así te verán las personas con las que uses Urbify.</p>
                  <div className="pf-row">
                    <div className="pf-field">
                      <label className="pf-label" htmlFor="pf-nombre">Nombre</label>
                      <input
                        id="pf-nombre"
                        className="pf-input"
                        value={form.nombre}
                        onChange={cambiar('nombre')}
                        maxLength={100}
                        autoComplete="given-name"
                        aria-invalid={nombreVacio}
                        aria-describedby={nombreVacio ? 'pf-nombre-err' : undefined}
                      />
                      {nombreVacio && <p className="pf-error" id="pf-nombre-err">Escribe tu nombre.</p>}
                    </div>
                    <div className="pf-field">
                      <label className="pf-label" htmlFor="pf-apellido">Apellido</label>
                      <input
                        id="pf-apellido"
                        className="pf-input"
                        value={form.apellido}
                        onChange={cambiar('apellido')}
                        maxLength={100}
                        autoComplete="family-name"
                        aria-invalid={apellidoVacio}
                        aria-describedby={apellidoVacio ? 'pf-apellido-err' : undefined}
                      />
                      {apellidoVacio && <p className="pf-error" id="pf-apellido-err">Escribe tu apellido.</p>}
                    </div>
                  </div>
                </section>

                <section className="pf-sec">
                  <h3>Contacto y dirección</h3>
                  <p className="pf-sd">Para coordinar tus visitas.</p>
                  <div className="pf-field">
                    <label className="pf-label" htmlFor="pf-telefono">Teléfono</label>
                    <input
                      id="pf-telefono"
                      ref={telefonoRef}
                      className="pf-input"
                      type="tel"
                      inputMode="tel"
                      maxLength={20}
                      placeholder="300 123 4567"
                      autoComplete="tel"
                      value={form.telefono}
                      onChange={cambiar('telefono')}
                      aria-invalid={Boolean(errorTelefono)}
                      aria-describedby={textoErrorTel ? 'pf-telefono-err' : 'pf-telefono-ayuda'}
                    />
                    {textoErrorTel
                      ? <p className="pf-error" id="pf-telefono-err">{textoErrorTel}</p>
                      : <p className="pf-hint" id="pf-telefono-ayuda">Solo números, de 7 a 15.</p>}
                  </div>
                  <div className="pf-field">
                    <label className="pf-label" htmlFor="pf-direccion">Dirección</label>
                    <input
                      id="pf-direccion"
                      className="pf-input"
                      maxLength={255}
                      autoComplete="street-address"
                      placeholder="Calle y barrio"
                      value={form.direccion}
                      onChange={cambiar('direccion')}
                    />
                  </div>
                </section>

                <section className="pf-sec">
                  <h3>Cuenta</h3>
                  <div className="pf-acc">
                    <div>
                      Correo
                      <small>{cuenta.correo || '—'}</small>
                    </div>
                    <span className="pf-note">No se puede cambiar aquí</span>
                  </div>
                </section>
              </div>

              {modificado && (
                <div className="pf-savebar" role="group" aria-label="Cambios sin guardar">
                  <span>Tienes cambios sin guardar</span>
                  <div className="pf-savebar-btns">
                    <button type="button" className="pf-btn" onClick={descartar} disabled={guardando}>Descartar</button>
                    <button type="submit" className="pf-btn pf-btn--primary" disabled={!puedeGuardar}>
                      {guardando ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <aside className="pf-side">
              <div className="pf-card">
                <h3>Tu cuenta</h3>
                <p className="pf-sd">Un vistazo a tu actividad.</p>
                <div className="pf-st">
                  <span>Miembro desde</span>
                  <b className="pf-st-s">{formatearMiembroDesde(cuenta.fecha_creacion)}</b>
                </div>
                {resumen && (
                  <>
                    <div className="pf-st">
                      <span>{rol === 'proveedor' ? 'Solicitudes recibidas' : 'Solicitudes realizadas'}</span>
                      <b>{resumen.total}</b>
                    </div>
                    <div className="pf-st">
                      <span>Servicios completados</span>
                      <b>{resumen.completadas}</b>
                    </div>
                  </>
                )}
                {(rol === 'cliente' || rol === 'proveedor') && (
                  <Link className="pf-lnk" to="/mis-solicitudes">
                    {rol === 'proveedor' ? 'Ver solicitudes recibidas →' : 'Ver mis solicitudes →'}
                  </Link>
                )}
              </div>
            </aside>
          </form>
        )}

        {aviso && <div className="pf-toast" role="status">{aviso}</div>}
      </div>
    </DashboardLayout>
  );
}
