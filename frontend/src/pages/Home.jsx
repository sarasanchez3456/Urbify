import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScrollGlobe } from '../components/ui/landing-page';
import HeroUrbify from '../components/HeroUrbify';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Home.css';

const Icon = ({ d, vb = '0 0 24 24', children }) => (
  <svg viewBox={vb} fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);

const ICONS = {
  bolt:   <Icon d="M13 2.5 5.5 13.5h5L9.5 21.5 18.5 9.5h-6l.5-7Z" />,
  drop:   <Icon><path d="M12 3.5C12 3.5 6 10.5 6 14.5a6 6 0 0 0 12 0c0-4-6-11-6-11Z"/><path d="M9.5 15.5a2.5 2.5 0 0 0 2 2.4"/></Icon>,
  gear:   <Icon><circle cx="12" cy="12" r="3"/><path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20M6.3 6.3l1.6 1.6M16.1 16.1l1.6 1.6M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6"/></Icon>,
  hammer: <Icon><path d="M14.5 3.5 20 9l-2.5 2.5L12 6l2.5-2.5Z"/><path d="M12.8 7.8 4 16.5 7 19.5l8.8-8.7"/></Icon>,
  roller: <Icon><rect x="4" y="4.5" width="12" height="4.5" rx="1"/><path d="M16 6.5h3.5v4.5H12v3M12 14v5.5"/></Icon>,
  sprout: <Icon><path d="M12 21v-7"/><path d="M12 14c0-4.5-3.2-6.8-7.5-6.8C4.5 11.7 7.7 14 12 14Z"/><path d="M12 11.5c0-3.5 2.5-5.3 6-5.3 0 3.5-2.5 5.3-6 5.3Z"/></Icon>,
  search: <Icon><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/></Icon>,
  user:   <Icon><circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.4-3.2 4-4.5 7-4.5s5.6 1.3 7 4.5"/></Icon>,
  clipboard: <Icon><rect x="6" y="5" width="12" height="15.5" rx="1.5"/><path d="M9 5V3.5h6V5M9.5 10.5h5M9.5 14h5M9.5 17.5h3"/></Icon>,
  star:   <Icon d="m12 3.5 2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7L12 3.5Z" />,
};

const CATS = [
  { name: 'Electricidad', icon: 'bolt' }, { name: 'Plomer\u00eda', icon: 'drop' },
  { name: 'Mec\u00e1nica', icon: 'gear' },     { name: 'Carpinter\u00eda', icon: 'hammer' },
  { name: 'Pintura', icon: 'roller' },    { name: 'Jardiner\u00eda', icon: 'sprout' },
];

const STEPS = [
  { icon: 'search',    title: 'Busca el servicio',  desc: 'Escribe lo que necesitas o explora el mapa: ver\u00e1s qui\u00e9n est\u00e1 disponible cerca de ti.' },
  { icon: 'user',      title: 'Revisa el perfil',   desc: 'Calificaciones reales, experiencia verificada y tarifas claras antes de decidir.' },
  { icon: 'clipboard', title: 'Solicita y agenda',  desc: 'Describe el trabajo, acuerda la hora y recibe confirmaci\u00f3n en minutos.' },
  { icon: 'star',      title: 'Califica al final',  desc: 'Tu rese\u00f1a mantiene la calidad de la comunidad para el siguiente vecino.' },
];

export default function Home() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [stats, setStats] = useState(null);
  const [destacados, setDestacados] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/buscar');
    }
  };

  useEffect(() => {
    api.get('/stats').then(res => setStats(res.data)).catch(() => {});
    api.get('/servicios/destacados').then(res => setDestacados(res.data)).catch(() => {});
  }, []);

  const demoSections = [
    {
      id: "cta",
      badge: "Profesionales",
      title: "¿Eres un profesional?",
      description: "Únete a miles de proveedores y ofrece tus servicios en Urbify.",
      align: "center",
      actions: [
        { label: "Saber más", variant: "ghost", onClick: () => navigate('/registro') },
        { label: "Registrarse Gratis", variant: "primary", onClick: () => navigate('/registro') },
      ]
    },
    {
      id: "innovation",
      badge: "Profesionales",
      title: "Verificados",
      subtitle: "y Confiables",
      description: "Todos nuestros proveedores pasan por un proceso de verificación. Revisa sus calificaciones, experiencia y tarifas antes de contratar con total confianza.",
      align: "center",
    },
    {
      id: "discovery",
      badge: "Servicios",
      title: "Categorías",
      subtitle: "Disponibles",
      description: "Encuentra el profesional ideal para cada necesidad: electricidad, plomería, mecánica, carpintería, pintura, jardinería y más.",
      align: "left",
      features: [
        { title: "Cobertura en toda la ciudad", description: "Profesionales disponibles en múltiples zonas y horarios" },
        { title: "Disponibilidad en tiempo real", description: "Ve quién está disponible ahora y contrata al instante" },
        { title: "Calificaciones transparentes", description: "Cada servicio tiene reseñas reales de la comunidad Urbify" }
      ]
    },
  ];

  return (
    <div className="home-wrapper">
      {/* Hero Urbify with spotlight effect */}
      <HeroUrbify />

      {/* ScrollGlobe immersive sections */}
      <ScrollGlobe sections={demoSections} />

      {/* STATS BAND */}
      <div className="stats-band">
        <div className="stats-inner">
          <div className="stat-item">
            <span className="stat-number">{stats ? stats.proveedores_activos : '—'}</span>
            <span className="stat-label">Proveedores Activos</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">{stats ? stats.servicios_realizados : '—'}</span>
            <span className="stat-label">Servicios Realizados</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">{stats ? `${stats.calificacion_media}★` : '—'}</span>
            <span className="stat-label">Calificación Media</span>
          </div>
        </div>
      </div>



      {/* CATEGORIES */}
      <section className="uy-sec" id="servicios">
        <div className="uy-sec-head">
          <span className="uy-tag">Categorías</span>
          <h2>¿Qué necesita tu casa hoy?</h2>
          <p>Seis oficios, cientos de manos expertas cerca de ti.</p>
        </div>
        <div className="uy-cats">
          {CATS.map((c, i) => (
            <button key={c.name} className="uy-cat"
              onClick={() => navigate(`/buscar?cat=${c.name}`)} aria-label={c.name}>
              <span className="uy-cat-ic">{ICONS[c.icon]}</span>
              <span className="uy-cat-name">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* SEARCH */}
      <section className="sec-search">
        <div className="search-box glass-card">
          <h3 className="search-title">Buscar Servicios</h3>
          <form onSubmit={handleSearch} className="search-bar">
            <input
              className="search-input"
              placeholder="Ej: instalación eléctrica, reparación de tuberías..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-btn">Buscar</button>
          </form>
        </div>
      </section>

      {/* SERVICES */}
      <section className="sec-services">
        <div className="sec-head">
          <div className="sec-tag">// Profesionales</div>
          <h2 className="sec-title">Servicios Destacados</h2>
          <p className="sec-subtitle">Profesionales verificados con las mejores calificaciones</p>
        </div>
        <div className="services-grid">
          {destacados.map((svc, i) => {
            const initials = (svc.nombre?.[0] || '') + (svc.apellido?.[0] || '');
            const nombreCorto = svc.nombre ? svc.nombre + ' ' + (svc.apellido?.[0] || '') + '.' : 'Proveedor';
            const catIcon = {
              'Electricidad': '⚡',
              'Plomería': '🔧',
              'Mecánica': '🔩',
              'Carpintería': '🪚',
              'Pintura': '🎨',
              'Jardinería': '🌿',
              'Cerrajería': '🔒',
              'Limpieza': '🧹',
            }[svc.categoria_nombre] || '⭐';
            const palettes = [
              { back: 'fc-back--green', frontBg: 'linear-gradient(160deg, #071e1f 0%, #0e3530 55%, #1a4a3a 100%)', avatarBg: 'linear-gradient(135deg, #a9d2b6, #1e4f43)', accent: '#a9d2b6', tagBorder: 'rgba(169,210,182,0.3)' },
              { back: 'fc-back--teal', frontBg: 'linear-gradient(160deg, #071e20 0%, #0d3530 55%, #3a8a7a 100%)', avatarBg: 'linear-gradient(135deg, #9fd1c1, #4a9e8a)', accent: '#9fd1c1', tagBorder: 'rgba(159,209,193,0.3)' },
              { back: 'fc-back--orange', frontBg: 'linear-gradient(160deg, #1a0e08 0%, #2e1a0d 55%, #7a3010 100%)', avatarBg: 'linear-gradient(135deg, #ff9966, #c0392b)', accent: '#ff9966', tagBorder: 'rgba(255,153,102,0.3)' },
            ];
            const p = palettes[i % palettes.length];
            const bgImageMap = {
              'Electricidad': '/images/bg_electricidad_1780486963455.png',
              'Plomería': '/images/bg_plomeria_1780486974582.png',
              'Mecánica': '/images/bg_mecanica_1780486988149.png',
              'Carpintería': '/images/bg_carpinteria_1780487001930.png',
              'Pintura': '/images/bg_pintura_1780487014409.png',
              'Jardinería': '/images/bg_jardineria_1780487034986.png',
            };
            const catImage = bgImageMap[svc.categoria_nombre] || null;
            return (
              <div className="fc-card" key={svc.id}>
                <div className="fc-content">
                  <div className={'fc-back ' + p.back}>
                    <div 
                      className="fc-back-content fc-svc-body"
                      style={catImage ? { backgroundImage: `linear-gradient(to bottom, rgba(9, 35, 36, 0.3), rgba(9, 35, 36, 0.9)), url(${catImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'transparent' } : undefined}
                    >
                      <div className="fc-svc-info">
                        <h4 className="fc-svc-title">{svc.titulo}</h4>
                        <p className="fc-svc-desc">{svc.descripcion}</p>
                      </div>
                      <span className="fc-svc-tag" style={{ color: p.accent, borderColor: p.tagBorder, backgroundColor: 'rgba(9, 35, 36, 0.6)', backdropFilter: 'blur(4px)' }}>{svc.categoria_nombre}</span>
                    </div>
                  </div>
                  <div className="fc-front" style={{ background: p.frontBg }}>
                    <div className="fc-front-content fc-prov-body">
                      <div className="fc-prov-top">
                        <div className="fc-avatar" style={{ background: p.avatarBg }}>{initials}</div>
                        <div className="fc-prov-meta">
                          <span className="fc-prov-name">{nombreCorto}</span>
                          <span className="fc-prov-cat">{catIcon} {svc.categoria_nombre}</span>
                        </div>
                      </div>
                      <div className="fc-prov-stats">
                        <div className="fc-prov-stat">
                          <span className="fc-prov-val">★ {parseFloat(svc.calificacion_promedio || 0).toFixed(1)}</span>
                          <span className="fc-prov-lbl">{svc.total_calificaciones} reseñas</span>
                        </div>
                        <div className="fc-prov-divider" />
                        <div className="fc-prov-stat">
                          <span className="fc-prov-val" style={p.accent !== '#a9d2b6' ? { color: p.accent } : undefined}>${Number(svc.tarifa || 0).toLocaleString()}</span>
                          <span className="fc-prov-lbl">por {svc.tipo_tarifa || 'hora'}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => navigate(usuario ? '/servicio/' + svc.id : '/login')} className="fc-prov-btn" style={p.accent !== '#a9d2b6' ? { background: 'rgba(' + (p.accent === '#9fd1c1' ? '159,209,193' : '255,153,102') + ',0.15)', borderColor: p.tagBorder, color: p.accent } : undefined}>Ver servicio →</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MAP */}
      <section className="sec-map">
        <div className="map-wrap">
          <div className="map-info glass-card">
            <div className="sec-tag">// Cobertura en Vivo</div>
            <h3>Profesionales cerca<br />de ti, ahora mismo.</h3>
            <p>Visualiza en el mapa interactivo dónde están los proveedores disponibles en tu zona. Filtra por categoría, calificación y disponibilidad.</p>
            <Link to="/mapa">
              <button className="hbtn-primary">Abrir Mapa →</button>
            </Link>
          </div>
          <div className="map-vis">
            <div className="map-grid-bg" />
            <div className="map-dot" style={{ top: '35%', left: '45%', '--dot-color': '#a9d2b6' }}>
              <span className="map-label">Electricista</span>
            </div>
            <div className="map-dot" style={{ top: '55%', left: '63%', '--dot-color': '#9fd1c1' }}>
              <span className="map-label">Plomero</span>
            </div>
            <div className="map-dot" style={{ top: '27%', left: '71%', '--dot-color': '#ff6b35' }}>
              <span className="map-label">Mecánico</span>
            </div>
            <div className="map-dot" style={{ top: '67%', left: '30%', '--dot-color': '#a9d2b6' }}>
              <span className="map-label">Carpintero</span>
            </div>
            <div className="map-dot" style={{ top: '40%', left: '22%', '--dot-color': '#9fd1c1' }}>
              <span className="map-label">Pintor</span>
            </div>
            <svg className="map-lines">
              <line x1="45%" y1="35%" x2="63%" y2="55%" stroke="#a9d2b6" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
              <line x1="63%" y1="55%" x2="71%" y2="27%" stroke="#9fd1c1" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
              <line x1="71%" y1="27%" x2="30%" y2="67%" stroke="#ff6b35" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
              <line x1="30%" y1="67%" x2="22%" y2="40%" stroke="#a9d2b6" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
              <line x1="22%" y1="40%" x2="45%" y2="35%" stroke="#9fd1c1" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
            </svg>
            <div className="map-city-label">MEDELLÍN — COL</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="uy-sec" style={{ scrollMarginTop: '100px' }}>
        <div className="uy-sec-head">
          <span className="uy-tag">Cómo funciona</span>
          <h2>De la necesidad a la solución</h2>
          <p>Cuatro pasos, sin llamadas a desconocidos ni precios sorpresa.</p>
        </div>
        <ol className="uy-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="uy-step">
              <span className="uy-step-ic">{ICONS[s.icon]}</span>
              <h3><span>{i + 1}.</span> {s.title}</h3>
              <p>{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">URBIFY</div>
            <p className="footer-desc">La plataforma de servicios urbanos del futuro.</p>
          </div>
          <div className="footer-links">
            <span style={{ color: 'rgba(193,200,193,0.4)', fontSize: '0.85rem' }}>Términos</span>
            <span style={{ color: 'rgba(193,200,193,0.4)', fontSize: '0.85rem' }}>Privacidad</span>
            <span style={{ color: 'rgba(193,200,193,0.4)', fontSize: '0.85rem' }}>Contacto</span>
          </div>
          <div className="footer-copy">
            © 2026 Urbify · Servicios Urbanos del Futuro
          </div>
        </div>
      </footer>
    </div>
  );
}
