import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export default function Home() {
  const { usuario } = useAuth();
  const hero3dRef = useRef(null);

  useEffect(() => {
    const hc = hero3dRef.current;
    if (!hc) return;
    const W = hc.offsetWidth, H = hc.offsetHeight;
    hc.width = W; hc.height = H;
    const hx = hc.getContext('2d');
    let t = 0;
    let animationId;

    function proj(x, y, z, cx, cy, fov = 380) {
      const s = fov / (fov + z); return { x: cx + x * s, y: cy + y * s, s };
    }

    function building(bx, h, w, clr) {
      const bz = 0;
      const gnd = H * 0.76;
      const p = proj(bx, 0, bz, W / 2, gnd);
      const left = W / 2 + (bx - w / 2) * p.s;
      const right = W / 2 + (bx + w / 2) * p.s;
      const top = gnd - h * p.s;

      hx.fillStyle = 'rgba(8,13,26,.96)';
      hx.strokeStyle = `rgba(${clr},.13)`;
      hx.lineWidth = 1;
      hx.beginPath(); hx.rect(left, top, right - left, gnd - top);
      hx.fill(); hx.stroke();

      const cols = Math.max(1, Math.floor((right - left) / 10));
      const rows = Math.max(1, Math.floor((gnd - top) / 14));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const lit = Math.sin(t * 0.018 + bx * 0.08 + r * 0.6 + c * 0.4) > 0.05;
        if (lit) {
          hx.fillStyle = `rgba(${clr},.22)`;
          hx.fillRect(left + 2 + c * (right - left) / cols, top + 2 + r * (gnd - top) / rows,
            (right - left) / cols - 3, (gnd - top) / rows - 3);
        }
      }
    }

    function ring3d(cx, cy, rx, ry, ang, clr, a) {
      hx.save(); hx.translate(cx, cy); hx.rotate(ang);
      hx.beginPath(); hx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      hx.strokeStyle = clr; hx.globalAlpha = a; hx.lineWidth = 1.5; hx.stroke();
      hx.globalAlpha = 1; hx.restore();
    }

    function cube(cx, cy, sz, ang) {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const vraw = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
      const v = vraw.map(([x, y, z]) => {
        const rx = x * ca - z * sa, rz = x * sa + z * ca;
        return proj(rx * sz, y * sz, rz * sz + 320, cx, cy);
      });
      [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5]].forEach((f, i) => {
        hx.beginPath(); hx.moveTo(v[f[0]].x, v[f[0]].y);
        f.slice(1).forEach(j => hx.lineTo(v[j].x, v[j].y)); hx.closePath();
        hx.fillStyle = `rgba(0,245,255,${[.07, .06, .05, .04, .04, .03][i]})`; hx.fill();
        hx.strokeStyle = 'rgba(0,245,255,.28)'; hx.lineWidth = 0.8; hx.stroke();
      });
    }

    const blds = [
      { bx: -130, h: 200, w: 52, c: '0,245,255' },
      { bx: -72, h: 300, w: 36, c: '180,79,255' },
      { bx: -8, h: 390, w: 62, c: '0,245,255' },
      { bx: 65, h: 260, w: 42, c: '180,79,255' },
      { bx: 135, h: 185, w: 46, c: '0,245,255' },
      { bx: -185, h: 140, w: 30, c: '0,245,255' },
      { bx: 192, h: 160, w: 30, c: '180,79,255' },
    ];

    function renderHero() {
      t++;
      hx.clearRect(0, 0, W, H);
      const g = hx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, W * 0.5);
      g.addColorStop(0, 'rgba(0,245,255,.05)'); g.addColorStop(1, 'transparent');
      hx.fillStyle = g; hx.fillRect(0, 0, W, H);

      for (let i = -6; i <= 6; i++) {
        const px = proj(i * 55, 0, 0, W / 2, H * 0.76);
        hx.beginPath(); hx.moveTo(W / 2 + (i * 55) * px.s, H * 0.76);
        hx.lineTo(W / 2 + (i * 55) * proj(i * 55, 0, 500, W / 2, H * 0.76).s, H);
        hx.strokeStyle = 'rgba(0,245,255,.04)'; hx.lineWidth = 1; hx.stroke();
      }

      blds.forEach(b => building(b.bx, b.h, b.w, b.c));

      hx.beginPath(); hx.moveTo(0, H * 0.76); hx.lineTo(W, H * 0.76);
      const gl = hx.createLinearGradient(0, 0, W, 0);
      gl.addColorStop(0, 'transparent'); gl.addColorStop(.5, 'rgba(0,245,255,.35)'); gl.addColorStop(1, 'transparent');
      hx.strokeStyle = gl; hx.lineWidth = 1; hx.stroke();

      const cx = W / 2, cy = H * 0.38;
      ring3d(cx, cy, 88, 22, t * 0.011, 'rgba(0,245,255,.55)', .5);
      ring3d(cx, cy, 64, 16, -t * 0.016 + 1, 'rgba(180,79,255,.55)', .4);
      ring3d(cx, cy, 108, 30, t * 0.008 + 2, 'rgba(0,245,255,.28)', .22);

      cube(cx + Math.sin(t * 0.021) * 115, cy + Math.cos(t * 0.014) * 42 - 22, 14, t * 0.022);
      cube(cx + Math.sin(t * 0.016 + 2) * -92, cy + Math.cos(t * 0.011 + 1) * 52 + 8, 10, -t * 0.026);
      cube(cx + Math.sin(t * 0.019 + 4) * 65, cy + Math.cos(t * 0.022 + 3) * 68 - 48, 8, t * 0.032);

      const ng = hx.createRadialGradient(cx, cy, 0, cx, cy, 32);
      ng.addColorStop(0, 'rgba(0,245,255,.45)'); ng.addColorStop(1, 'transparent');
      hx.fillStyle = ng; hx.fillRect(cx - 32, cy - 32, 64, 64);
      hx.beginPath(); hx.arc(cx, cy, 4, 0, Math.PI * 2);
      hx.fillStyle = '#00f5ff';
      hx.shadowBlur = 18; hx.shadowColor = '#00f5ff'; hx.fill(); hx.shadowBlur = 0;

      animationId = requestAnimationFrame(renderHero);
    }
    renderHero();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="wrap">
      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <div className="badge">Plataforma de Servicios Urbanos</div>
          <h1>
            <span className="h1-plain">Conectamos tu hogar</span>
            <span className="h1-grad">con el futuro.</span>
          </h1>
          <p>Encuentra electricistas, plomeros, mecánicos y más — verificados, calificados y disponibles en tu ciudad en tiempo real.</p>
          <div className="hero-btns">
            <Link to="/buscar">
              <button className="hbtn-p">Buscar Servicios</button>
            </Link>
            <Link to="/mapa">
              <button className="hbtn-g">Ver Mapa en Vivo →</button>
            </Link>
          </div>
          <div className="hero-stats">
            <div><span className="stat-n">2.4K</span><span className="stat-l">Proveedores Activos</span></div>
            <div><span className="stat-n">18K</span><span className="stat-l">Servicios Completados</span></div>
            <div><span className="stat-n">4.9★</span><span className="stat-l">Calificación Media</span></div>
          </div>
        </div>
        <div className="hero-right">
          <canvas ref={hero3dRef} id="hero3d"></canvas>
        </div>
      </section>

      {/* TICKER */}
      <div className="ticker-wrap">
        <div className="ticker">
          <span className="tick-item">Electricidad</span><span className="tick-item">Plomería</span><span className="tick-item">Mecánica</span><span className="tick-item">Carpintería</span><span className="tick-item">Pintura</span><span className="tick-item">Jardinería</span><span className="tick-item">Cerrajería</span><span className="tick-item">Climatización</span><span className="tick-item">Electricidad</span><span className="tick-item">Plomería</span><span className="tick-item">Mecánica</span><span className="tick-item">Carpintería</span><span className="tick-item">Pintura</span><span className="tick-item">Jardinería</span><span className="tick-item">Cerrajería</span><span className="tick-item">Climatización</span>
        </div>
      </div>

      {/* CATEGORIES */}
      <section className="sec-cats">
        <div className="sec-head">
          <div className="sec-tag">// Categorías</div>
          <h2 className="sec-title">¿Qué necesitas hoy?</h2>
        </div>
        <div className="cats-grid">
          <div className="cat-card">
            <div className="cat-icon"><span>⚡</span><div className="cat-ring"></div></div>
            <div className="cat-name">Electricidad</div>
            <div className="cglow"></div>
          </div>
          <div className="cat-card" style={{ '--cyan': '#b44fff' }}>
            <div className="cat-icon"><span>🔧</span><div className="cat-ring" style={{ borderColor: 'rgba(180,79,255,.28)' }}></div></div>
            <div className="cat-name">Plomería</div>
            <div className="cglow" style={{ background: '#b44fff' }}></div>
          </div>
          <div className="cat-card" style={{ '--cyan': '#ff6b35' }}>
            <div className="cat-icon"><span>🔩</span><div className="cat-ring" style={{ borderColor: 'rgba(255,107,53,.28)' }}></div></div>
            <div className="cat-name">Mecánica</div>
            <div className="cglow" style={{ background: '#ff6b35' }}></div>
          </div>
          <div className="cat-card">
            <div className="cat-icon"><span>🪚</span><div className="cat-ring"></div></div>
            <div className="cat-name">Carpintería</div>
            <div className="cglow"></div>
          </div>
          <div className="cat-card" style={{ '--cyan': '#b44fff' }}>
            <div className="cat-icon"><span>🎨</span><div className="cat-ring" style={{ borderColor: 'rgba(180,79,255,.28)' }}></div></div>
            <div className="cat-name">Pintura</div>
            <div className="cglow" style={{ background: '#b44fff' }}></div>
          </div>
          <div className="cat-card" style={{ '--cyan': '#00ff88' }}>
            <div className="cat-icon"><span>🌿</span><div className="cat-ring" style={{ borderColor: 'rgba(0,255,136,.28)' }}></div></div>
            <div className="cat-name">Jardinería</div>
            <div className="cglow" style={{ background: '#00ff88' }}></div>
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section className="sec-search">
        <div className="search-box">
          <h3 className="search-title">BUSCAR SERVICIOS</h3>
          <div className="search-bar">
            <input className="search-input" placeholder="Ej: instalación eléctrica, reparación de tuberías..." />
            <button className="search-btn">Buscar</button>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="sec-services">
        <div className="sec-head">
          <div className="sec-tag">// Servicios Destacados</div>
          <h2 className="sec-title">Profesionales Verificados</h2>
        </div>
        <div className="services-grid">
          <div className="svc-card">
            <div className="svc-avatar">JR</div>
            <span className="svc-cat">⚡ Electricidad</span>
            <h3 className="svc-title">Instalaciones Eléctricas Residenciales</h3>
            <p className="svc-desc">Especialista en instalaciones, revisiones y mantenimiento eléctrico para hogares y locales comerciales en toda la ciudad.</p>
            <div className="svc-foot">
              <span className="svc-price">$45,000 / hora</span>
              <span className="svc-rating">★ 4.9 <span>(128)</span></span>
            </div>
          </div>
          <div className="svc-card">
            <div className="svc-avatar" style={{ background: 'linear-gradient(135deg,var(--violet),#ff44aa)' }}>ML</div>
            <span className="svc-cat" style={{ color: 'var(--violet)' }}>🔧 Plomería</span>
            <h3 className="svc-title">Reparación y Mantenimiento de Tuberías</h3>
            <p className="svc-desc">Detección de fugas, reparación de tuberías, instalación de sanitarios y sistemas de agua residencial y comercial.</p>
            <div className="svc-foot">
              <span className="svc-price" style={{ color: 'var(--violet)' }}>$38,000 / hora</span>
              <span className="svc-rating">★ 4.8 <span>(94)</span></span>
            </div>
          </div>
          <div className="svc-card">
            <div className="svc-avatar" style={{ background: 'linear-gradient(135deg,var(--orange),#ffb020)' }}>CA</div>
            <span className="svc-cat" style={{ color: 'var(--orange)' }}>🔩 Mecánica</span>
            <h3 className="svc-title">Mecánica a Domicilio y Diagnóstico</h3>
            <p className="svc-desc">Revisión, diagnóstico y reparación de vehículos livianos en la comodidad de tu hogar o lugar de trabajo.</p>
            <div className="svc-foot">
              <span className="svc-price" style={{ color: 'var(--orange)' }}>$55,000 / hora</span>
              <span className="svc-rating">★ 4.7 <span>(67)</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="sec-map">
        <div className="map-wrap">
          <div className="map-info">
            <div className="sec-tag">// Cobertura en Tiempo Real</div>
            <h3>Profesionales cerca<br />de ti, ahora mismo.</h3>
            <p>Visualiza en el mapa interactivo dónde están los proveedores disponibles en tu zona. Filtra por categoría, calificación y disponibilidad.</p>
            <Link to="/mapa">
              <button className="hbtn-p">Abrir Mapa →</button>
            </Link>
          </div>
          <div className="map-vis">
            <div className="map-grid-bg"></div>
            <div className="mdot c" style={{ top: '35%', left: '45%' }}><span className="mlabel">Electricista</span></div>
            <div className="mdot v" style={{ top: '55%', left: '63%' }}><span className="mlabel">Plomero</span></div>
            <div className="mdot o" style={{ top: '27%', left: '71%' }}><span className="mlabel">Mecánico</span></div>
            <div className="mdot c" style={{ top: '67%', left: '30%' }}><span className="mlabel">Carpintero</span></div>
            <div className="mdot v" style={{ top: '40%', left: '22%' }}><span className="mlabel">Pintor</span></div>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .14 }}>
              <line x1="45%" y1="35%" x2="63%" y2="55%" stroke="#00f5ff" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="63%" y1="55%" x2="71%" y2="27%" stroke="#b44fff" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="45%" y1="35%" x2="30%" y2="67%" stroke="#00f5ff" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="30%" y1="67%" x2="22%" y2="40%" stroke="#b44fff" strokeWidth="1" strokeDasharray="5,5" />
            </svg>
            <div className="map-city">MEDELLÍN — COL</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="sec-how">
        <div className="sec-head">
          <div className="sec-tag">// Proceso</div>
          <h2 className="sec-title">Así de Simple</h2>
        </div>
        <div className="steps">
          <div className="step-card">
            <div className="step-num">01</div>
            <div className="step-icon">🔍</div>
            <div className="step-title">Busca el Servicio</div>
            <p className="step-desc">Usa el buscador o el mapa para encontrar el profesional ideal cerca de ti.</p>
          </div>
          <div className="step-card">
            <div className="step-num">02</div>
            <div className="step-icon">👤</div>
            <div className="step-title">Revisa el Perfil</div>
            <p className="step-desc">Lee calificaciones, experiencia y tarifas antes de tomar una decisión.</p>
          </div>
          <div className="step-card">
            <div className="step-num">03</div>
            <div className="step-icon">📋</div>
            <div className="step-title">Solicita el Servicio</div>
            <p className="step-desc">Envía tu solicitud con detalles del trabajo y recibe confirmación rápida.</p>
          </div>
          <div className="step-card">
            <div className="step-num">04</div>
            <div className="step-icon">⭐</div>
            <div className="step-title">Califica y Listo</div>
            <p className="step-desc">Tras el servicio, deja tu calificación y ayuda a la comunidad Urbify.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="cta-band">
        <div className="cta-text">
          <h2>¿Eres un profesional?<br />Ofrece tus servicios en Urbify.</h2>
          <p>Únete a miles de proveedores y consigue más clientes hoy mismo.</p>
        </div>
        <div className="cta-btns">
          <Link to="/registro">
            <button className="nbtn nbtn-outline">Saber más</button>
          </Link>
          <Link to="/registro">
            <button className="nbtn nbtn-fill">Registrarse Gratis</button>
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="foot-logo">URBIFY</div>
        <div className="foot-copy">© 2025 Urbify · Servicios Urbanos del Futuro</div>
        <div className="foot-links">
          <Link to="/">Términos</Link>
          <Link to="/">Privacidad</Link>
          <Link to="/">Contacto</Link>
        </div>
      </footer>
    </div>
  );
}
