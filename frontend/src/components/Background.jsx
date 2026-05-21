import React, { useEffect, useRef } from 'react';

export function Background() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random() * 0.35 + 0.08
    }));

    const drawBG = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 245, 255, ${p.a})`;
        ctx.fill();

        pts.forEach(q => {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0, 245, 255, ${0.04 * (1 - d / 90)})`;
            ctx.stroke();
          }
        });
      });
      animationFrameId = requestAnimationFrame(drawBG);
    };

    drawBG();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <div 
        className="fixed inset-0 pointer-events-none z-[500]" 
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)'
        }}
      />
      <div 
        className="fixed inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 245, 255, 0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 245, 255, 0.025) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 z-0 opacity-45 pointer-events-none"
      />
    </>
  );
}
