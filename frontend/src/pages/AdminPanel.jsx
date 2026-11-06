import { useEffect, useState } from 'react';
import api from '../api/axios';
import DashboardLayout from '../components/DashboardLayout';

const glass = {
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
  borderRadius: '1rem',
  padding: '1.25rem',
};

const ESTADOS = [
  ['pendiente', 'Pendientes'],
  ['aceptada', 'Aceptadas'],
  ['en_proceso', 'En proceso'],
  ['completada', 'Completadas'],
  ['cancelada', 'Canceladas'],
];

function Cifra({ etiqueta, valor }) {
  return (
    <div style={glass}>
      <div className="text-sm" style={{ color: 'oklch(0.45 0.03 240)' }}>{etiqueta}</div>
      <div className="text-3xl font-bold mt-1" style={{ color: 'oklch(0.40 0.18 255)' }}>{valor}</div>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-3" style={{ color: 'oklch(0.25 0.06 240)' }}>{titulo}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">{children}</div>
    </section>
  );
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/stats/admin')
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.error || 'No se pudieron cargar las estadísticas'));
  }, []);

  return (
    <DashboardLayout titulo="Panel de administración" subtitulo="Estadísticas generales del sistema">
      {error && <p style={{ color: 'oklch(0.55 0.2 25)' }}>{error}</p>}
      {!stats && !error && <p style={{ color: 'oklch(0.45 0.03 240)' }}>Cargando…</p>}
      {stats && (
        <>
          <Seccion titulo="Usuarios">
            <Cifra etiqueta="Clientes" valor={stats.usuarios_por_rol.cliente} />
            <Cifra etiqueta="Proveedores" valor={stats.usuarios_por_rol.proveedor} />
            <Cifra etiqueta="Administradores" valor={stats.usuarios_por_rol.admin} />
          </Seccion>
          <Seccion titulo="Servicios">
            <Cifra etiqueta="Total" valor={stats.servicios.total} />
            <Cifra etiqueta="Disponibles" valor={stats.servicios.disponibles} />
          </Seccion>
          <Seccion titulo="Solicitudes por estado">
            {ESTADOS.map(([clave, etiqueta]) => (
              <Cifra key={clave} etiqueta={etiqueta} valor={stats.solicitudes_por_estado[clave]} />
            ))}
          </Seccion>
          <Seccion titulo="Calificaciones">
            <Cifra etiqueta="Total" valor={stats.calificaciones.total} />
            <Cifra etiqueta="Media" valor={stats.calificaciones.total ? stats.calificaciones.media.toFixed(1) : '—'} />
          </Seccion>
        </>
      )}
    </DashboardLayout>
  );
}
