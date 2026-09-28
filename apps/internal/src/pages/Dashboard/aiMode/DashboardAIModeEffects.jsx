import React, { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDashboardAIMode } from "./DashboardAIModeContext";
import DashboardAIInsightPopup from "./DashboardAIInsightPopup";

const TRAIL_EASE = [0.35, 0.22, 0.14];

const DashboardAIModeEffects = () => {
  const { aiMode, exitAIMode, deselect, selectedId } = useDashboardAIMode();
  const [cursor, setCursor] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [showTip, setShowTip] = useState(false);
  const trailRefs = useRef([]);
  const trailPos = useRef([
    { x: cursor.x, y: cursor.y },
    { x: cursor.x, y: cursor.y },
    { x: cursor.x, y: cursor.y },
  ]);
  const mouseRef = useRef(cursor);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const particleRafRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    if (!aiMode) {
      setShowTip(false);
      return undefined;
    }
    setShowTip(true);
    const timer = setTimeout(() => setShowTip(false), 4200);
    return () => clearTimeout(timer);
  }, [aiMode]);

  useEffect(() => {
    if (!aiMode) return undefined;
    const onMove = (event) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
      setCursor({ x: event.clientX, y: event.clientY });
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [aiMode]);

  useEffect(() => {
    if (!aiMode) return undefined;
    const tick = () => {
      let tx = mouseRef.current.x;
      let ty = mouseRef.current.y;
      trailPos.current.forEach((pos, index) => {
        pos.x += (tx - pos.x) * TRAIL_EASE[index];
        pos.y += (ty - pos.y) * TRAIL_EASE[index];
        const el = trailRefs.current[index];
        if (el) {
          el.style.left = `${pos.x}px`;
          el.style.top = `${pos.y}px`;
        }
        tx = pos.x;
        ty = pos.y;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [aiMode]);

  useEffect(() => {
    if (!aiMode) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(60, Math.round((canvas.width * canvas.height) / 26000));
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.5 + 0.6,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const particles = particlesRef.current;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(142,124,248,${0.16 * (1 - dist / 130)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(124,231,255,0.55)";
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      particleRafRef.current = requestAnimationFrame(tick);
    };
    particleRafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      if (particleRafRef.current) cancelAnimationFrame(particleRafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [aiMode]);

  if (!aiMode) return null;

  const tipLeft =
    cursor.x + 22 + 250 > window.innerWidth ? cursor.x - 266 : cursor.x + 22;
  const tipTop =
    cursor.y + 22 + 60 > window.innerHeight ? cursor.y - 76 : cursor.y + 22;

  return createPortal(
    <>
      <div
        className="ai-dashboard-backdrop"
        onClick={() => {
          if (selectedId) deselect();
        }}
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="ai-dashboard-particles" aria-hidden="true" />
      <div className="ai-dashboard-cursor-trail" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`ai-dashboard-cursor-trail__dot ai-dashboard-cursor-trail__dot--${index}`}
            ref={(el) => {
              trailRefs.current[index] = el;
            }}
          />
        ))}
      </div>
      <div
        className="ai-dashboard-cursor"
        style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
        aria-hidden="true"
      >
        <span className="ai-dashboard-cursor__core" />
        <span className="ai-dashboard-cursor__orbit" />
        <span className="ai-dashboard-cursor__orbit ai-dashboard-cursor__orbit--outer" />
      </div>
      <div
        className={`ai-dashboard-tooltip${showTip ? " is-visible" : ""}`}
        style={{ left: tipLeft, top: tipTop }}
      >
        Click any highlighted widget for AI analysis
        <span className="ai-dashboard-tooltip__hint">Press Esc to exit</span>
      </div>
      <button type="button" className="ai-dashboard-exit-chip" onClick={exitAIMode}>
        <span className="ai-dashboard-exit-chip__dot" aria-hidden="true" />
        AI Mode on · Esc to exit
      </button>
      <DashboardAIInsightPopup />
    </>,
    document.body,
  );
};

export default memo(DashboardAIModeEffects);
