import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SPOTLIGHT_R = 260;

function RevealLayer({ image, cursorX, cursorY }) {
  const canvasRef = useRef(null);
  const [mask, setMask] = useState('');
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    const update = () => {
      sizeRef.current = { w: window.innerWidth, h: window.innerHeight };
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sizeRef.current.w) return;
    canvas.width = sizeRef.current.w;
    canvas.height = sizeRef.current.h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h);

    const gradient = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, SPOTLIGHT_R);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.75)');
    gradient.addColorStop(0.75, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(0.88, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, SPOTLIGHT_R, 0, Math.PI * 2);
    ctx.fill();

    const dataUrl = canvas.toDataURL();
    rafRef.current = requestAnimationFrame(() => setMask(dataUrl));
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [cursorX, cursorY]);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ display: 'none' }} />
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
        style={{
          backgroundImage: `url(${image})`,
          WebkitMaskImage: mask || 'none',
          maskImage: mask || 'none',
          WebkitMaskSize: mask ? '100% 100%' : undefined,
          maskSize: mask ? '100% 100%' : undefined,
        }}
      />
    </>
  );
}

export default function HeroUrbify() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const mouseRef = useRef({ x: -999, y: -999 });
  const smoothRef = useRef({ x: -999, y: -999 });
  const rafRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMouseMove = useCallback((e) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const animate = () => {
      const smooth = smoothRef.current;
      const mouse = mouseRef.current;
      smooth.x += (mouse.x - smooth.x) * 0.1;
      smooth.y += (mouse.y - smooth.y) * 0.1;
      setCursorPos({ x: smooth.x, y: smooth.y });
      rafRef.current = requestAnimationFrame(animate);
    };
    window.addEventListener('mousemove', handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 256 256" fill="#a9d2b6">
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
          </svg>
          <span className="text-white text-2xl font-playfair italic">Urbify</span>
        </div>

        {/* Center nav - desktop */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
          <span className="text-white px-4 py-1.5 rounded-full text-sm font-medium">Inicio</span>
          {[
            { label: 'Servicios', href: '/buscar' },
            { label: 'Mapa', href: '/mapa' },
            { label: 'Cómo funciona', href: '/#como-funciona' },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="text-white/80 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-white/20 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right - desktop */}
        <div className="hidden md:flex items-center gap-3">
          {usuario ? (
            <Link
              to="/dashboard"
              className="bg-[#a9d2b6] text-[#001718] text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#8eb69b] transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-white/80 text-sm font-medium hover:text-white transition-colors">
                Iniciar Sesión
              </Link>
              <Link
                to="/registro"
                className="bg-[#a9d2b6] text-[#001718] text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#8eb69b] transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-[90] bg-[#001718]/95 backdrop-blur-lg flex flex-col items-center justify-center gap-6 md:hidden">
          <Link to="/" className="text-white text-2xl font-playfair italic" onClick={() => setMenuOpen(false)}>Urbify</Link>
          <Link to="/" className="text-white/80 text-lg hover:text-white" onClick={() => setMenuOpen(false)}>Inicio</Link>
          <Link to="/buscar" className="text-white/80 text-lg hover:text-white" onClick={() => setMenuOpen(false)}>Servicios</Link>
          <Link to="/mapa" className="text-white/80 text-lg hover:text-white" onClick={() => setMenuOpen(false)}>Mapa</Link>
          <Link to="/#como-funciona" className="text-white/80 text-lg hover:text-white" onClick={() => setMenuOpen(false)}>Cómo funciona</Link>
          {usuario ? (
            <Link to="/dashboard" className="bg-[#a9d2b6] text-[#001718] text-lg font-semibold px-8 py-3 rounded-full" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="text-white/80 text-lg hover:text-white" onClick={() => setMenuOpen(false)}>Iniciar Sesión</Link>
              <Link to="/registro" className="bg-[#a9d2b6] text-[#001718] text-lg font-semibold px-8 py-3 rounded-full" onClick={() => setMenuOpen(false)}>Registrarse</Link>
            </>
          )}
        </div>
      )}

      {/* Hero section */}
      <section
        className="relative w-full overflow-hidden h-screen bg-black"
        style={{ height: '100dvh' }}
      >
        {/* Base image - z-10 with Ken Burns zoom */}
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat hero-zoom"
          style={{
            backgroundImage: `url(/images/bg_electricidad_1780486963455.png)`,
            zIndex: 10,
          }}
        />

        {/* Dark overlay on base */}
        <div className="absolute inset-0 z-20" style={{
          background: 'linear-gradient(to bottom, rgba(0,23,24,0.3) 0%, rgba(0,23,24,0.6) 50%, rgba(0,23,24,0.9) 100%)',
        }} />

        {/* Reveal layer - z-30 */}
        <RevealLayer
          image="/images/bg_plomeria_1780486974582.png"
          cursorX={cursorPos.x}
          cursorY={cursorPos.y}
        />

        {/* Heading - z-50 */}
        <div className="absolute top-[14%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none z-50">
          <h1 className="text-white leading-[0.95]">
            <span
              className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal"
              style={{ letterSpacing: '-0.05em', animationDelay: '0.25s' }}
            >
              Conectamos tu hogar
            </span>
            <span
              className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal"
              style={{ letterSpacing: '-0.08em', animationDelay: '0.42s' }}
            >
              con los mejores
            </span>
          </h1>
        </div>

        {/* Bottom-left paragraph - z-50 */}
        <div className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 hero-anim hero-fade" style={{ animationDelay: '0.7s' }}>
          <p className="text-sm text-white/80 leading-relaxed">
            La plataforma que conecta a profesionales verificados con clientes que necesitan servicios para el hogar. Electricistas, plomeros, mecánicos y más, cerca de ti.
          </p>
        </div>

        {/* Bottom-right block - z-50 */}
        <div
          className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 z-50 hero-anim hero-fade"
          style={{ animationDelay: '0.85s' }}
        >
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Explora nuestro mapa interactivo, filtra por categoría y calificación, y encuentra al profesional ideal para cada necesidad de tu hogar.
          </p>
          <button
            onClick={() => navigate('/buscar')}
            className="bg-[#a9d2b6] hover:bg-[#8eb69b] text-[#001718] text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#a9d2b6]/30"
          >
            Buscar Servicios
          </button>
        </div>
      </section>
    </>
  );
}
