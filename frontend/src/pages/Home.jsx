import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScrollGlobe } from '../components/ui/landing-page';
import api from '../api/axios';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
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
      id: "hero",
      badge: "Información de Urbify",
      title: "Urbify",
      subtitle: "Servicios para el hogar",
      description: "La plataforma que conecta a profesionales verificados con clientes que necesitan servicios para el hogar. Electricistas, plomeros, mecánicos y más, cerca de ti.",
      align: "left",
      actions: [
        { label: "Buscar Servicios", variant: "primary", onClick: () => navigate('/buscar') },
        { label: "Ver Mapa en Vivo", variant: "secondary", onClick: () => navigate('/mapa') },
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
    {
      id: "future",
      badge: "Comunidad",
      title: "Únete a",
      subtitle: "Urbify",
      description: "Forma parte de la comunidad de servicios urbanos más confiable. Ofrece tus servicios o encuentra al profesional perfecto para tu hogar.",
      align: "center",
      actions: [
        { label: "Registrarse Gratis", variant: "primary", onClick: () => navigate('/registro') },
        { label: "Explorar Servicios", variant: "secondary", onClick: () => navigate('/buscar') }
      ]
    }
  ];

  return (
    <div className="home-wrapper">
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

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker">
          <span className="tick-item">Electricidad</span>
          <span className="tick-divider" />
          <span className="tick-item">Plomería</span>
          <span className="tick-divider" />
          <span className="tick-item">Mecánica</span>
          <span className="tick-divider" />
          <span className="tick-item">Carpintería</span>
          <span className="tick-divider" />
          <span className="tick-item">Pintura</span>
          <span className="tick-divider" />
          <span className="tick-item">Jardinería</span>
          <span className="tick-divider" />
          <span className="tick-item">Cerrajería</span>
          <span className="tick-divider" />
          <span className="tick-item">Climatización</span>
          <span className="tick-divider" />
          <span className="tick-item">Electricidad</span>
          <span className="tick-divider" />
          <span className="tick-item">Plomería</span>
          <span className="tick-divider" />
          <span className="tick-item">Mecánica</span>
          <span className="tick-divider" />
          <span className="tick-item">Carpintería</span>
          <span className="tick-divider" />
          <span className="tick-item">Pintura</span>
          <span className="tick-divider" />
          <span className="tick-item">Jardinería</span>
          <span className="tick-divider" />
          <span className="tick-item">Cerrajería</span>
          <span className="tick-divider" />
          <span className="tick-item">Climatización</span>
        </div>
      </div>

      {/* CATEGORIES */}
      <section className="sec-categories">
        <div className="sec-head">
          <div className="sec-tag">// Categorías</div>
          <h2 className="sec-title">¿Qué necesitas hoy?</h2>
          <p className="sec-subtitle">Explora nuestras categorías de servicios profesionales</p>
        </div>
        <div className="cats-grid">
          <Link to="/buscar" className="cat-card" tabIndex={0} aria-label="Electricidad">
            <div className="cat-icon-wrap">
              <span className="cat-icon">⚡</span>
              <div className="cat-ring" />
            </div>
            <div className="cat-name">Electricidad</div>
            <div className="cat-glow" />
          </Link>
          <Link to="/buscar" className="cat-card" tabIndex={0} aria-label="Plomería" data-accent="tertiary">
            <div className="cat-icon-wrap">
              <span className="cat-icon">🔧</span>
              <div className="cat-ring" />
            </div>
            <div className="cat-name">Plomería</div>
            <div className="cat-glow" />
          </Link>
          <Link to="/buscar" className="cat-card" tabIndex={0} aria-label="Mecánica" data-accent="accent">
            <div className="cat-icon-wrap">
              <span className="cat-icon">🔩</span>
              <div className="cat-ring" />
            </div>
            <div className="cat-name">Mecánica</div>
            <div className="cat-glow" />
          </Link>
          <Link to="/buscar" className="cat-card" tabIndex={0} aria-label="Carpintería">
            <div className="cat-icon-wrap">
              <span className="cat-icon">🪚</span>
              <div className="cat-ring" />
            </div>
            <div className="cat-name">Carpintería</div>
            <div className="cat-glow" />
          </Link>
          <Link to="/buscar" className="cat-card" tabIndex={0} aria-label="Pintura" data-accent="tertiary">
            <div className="cat-icon-wrap">
              <span className="cat-icon">🎨</span>
              <div className="cat-ring" />
            </div>
            <div className="cat-name">Pintura</div>
            <div className="cat-glow" />
          </Link>
          <Link to="/buscar" className="cat-card" tabIndex={0} aria-label="Jardinería" data-accent="secondary">
            <div className="cat-icon-wrap">
              <span className="cat-icon">🌿</span>
              <div className="cat-ring" />
            </div>
            <div className="cat-name">Jardinería</div>
            <div className="cat-glow" />
          </Link>
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
            return (
              <div className="fc-card" key={svc.id}>
                <div className="fc-content">
                  <div className={'fc-back ' + p.back}>
                    <div className="fc-back-content fc-svc-body">
                      <span className="fc-svc-icon">{catIcon}</span>
                      <div className="fc-svc-info">
                        <h4 className="fc-svc-title">{svc.titulo}</h4>
                        <p className="fc-svc-desc">{svc.descripcion}</p>
                      </div>
                      <span className="fc-svc-tag" style={{ color: p.accent, borderColor: p.tagBorder }}>{svc.categoria_nombre}</span>
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
                      <Link to={'/servicio/' + svc.id} className="fc-prov-btn" style={p.accent !== '#a9d2b6' ? { background: 'rgba(' + (p.accent === '#9fd1c1' ? '159,209,193' : '255,153,102') + ',0.15)', borderColor: p.tagBorder, color: p.accent } : undefined}>Ver servicio →</Link>
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
              <line x1="45%" y1="35%" x2="30%" y2="67%" stroke="#a9d2b6" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
              <line x1="30%" y1="67%" x2="22%" y2="40%" stroke="#9fd1c1" strokeWidth="1" strokeDasharray="4,4" opacity="0.3" />
            </svg>
            <div className="map-city-label">MEDELLÍN — COL</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="sec-how" style={{ scrollMarginTop: '100px' }}>
        <div className="sec-head">
          <div className="sec-tag">// Proceso</div>
          <h2 className="sec-title">Así de Simple</h2>
          <p className="sec-subtitle">Cuatro pasos para conectar con el profesional ideal</p>
        </div>
        <div className="steps">
          <div className="step-card glass-card">
            <div className="step-number">01</div>
            <div className="step-icon-wrap">
              <span className="step-icon">🔍</span>
            </div>
            <h4 className="step-title">Busca el Servicio</h4>
            <p className="step-desc">Usa el buscador o el mapa para encontrar el profesional ideal cerca de ti.</p>
          </div>
          <div className="step-card glass-card">
            <div className="step-number">02</div>
            <div className="step-icon-wrap">
              <span className="step-icon">👤</span>
            </div>
            <h4 className="step-title">Revisa el Perfil</h4>
            <p className="step-desc">Lee calificaciones, experiencia y tarifas antes de tomar una decisión.</p>
          </div>
          <div className="step-card glass-card">
            <div className="step-number">03</div>
            <div className="step-icon-wrap">
              <span className="step-icon">📋</span>
            </div>
            <h4 className="step-title">Solicita el Servicio</h4>
            <p className="step-desc">Envía tu solicitud con detalles del trabajo y recibe confirmación rápida.</p>
          </div>
          <div className="step-card glass-card">
            <div className="step-number">04</div>
            <div className="step-icon-wrap">
              <span className="step-icon">⭐</span>
            </div>
            <h4 className="step-title">Califica y Listo</h4>
            <p className="step-desc">Tras el servicio, deja tu calificación y ayuda a la comunidad Urbify.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="cta-band">
        <div className="cta-glow" />
        <div className="cta-content">
          <div className="cta-text">
            <h2>¿Eres un profesional?</h2>
            <p>Únete a miles de proveedores y ofrece tus servicios en Urbify.</p>
          </div>
          <div className="cta-btns">
            <Link to="/registro">
              <button className="hbtn-ghost">Saber más</button>
            </Link>
            <Link to="/registro">
              <button className="hbtn-primary">Registrarse Gratis</button>
            </Link>
          </div>
        </div>
      </div>

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
