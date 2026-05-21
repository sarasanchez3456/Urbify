import React, { useEffect, useRef } from 'react';

export function CustomCursor() {
  const curRef = useRef(null);
  const ringRef = useRef(null);
  
  useEffect(() => {
    const cur = curRef.current;
    const ring = ringRef.current;
    if (!cur || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;

    const onMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      cur.style.left = mx + 'px';
      cur.style.top = my + 'px';
    };

    const animate = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMouseMove);
    const animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <div 
        ref={curRef} 
        id="cur"
        className="fixed w-[10px] h-[10px] bg-[var(--cyan)] rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-[transform] duration-[0.08s]"
        style={{ boxShadow: '0 0 10px var(--cyan), 0 0 22px var(--cyan)' }}
      />
      <div 
        ref={ringRef} 
        id="cur-ring"
        className="fixed w-[34px] h-[34px] border border-[rgba(0,245,255,0.45)] rounded-full pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-[0.12s] ease-in-out"
      />
    </>
  );
}
