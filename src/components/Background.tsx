// THEME HOOK: to swap this component, replace Background.tsx only — no other files change

import { useEffect, useRef } from "react";

const COUNT = 80;
const LINK_DIST = 120;
const LINK_DIST_SQ = LINK_DIST * LINK_DIST;
const REPEL_RADIUS = 110;
const REPEL_RADIUS_SQ = REPEL_RADIUS * REPEL_RADIUS;
const REPEL_FORCE = 0.9;
const MAX_PUSH = 3.5;
const DRIFT_SPEED = 0.35;

interface Particle {
  x: number;
  y: number;
  /** Base drift — constant, only reversed on wall bounce */
  driftX: number;
  driftY: number;
  /** Mouse-repulsion impulse — decays each frame */
  pushX: number;
  pushY: number;
  r: number;
}

/** Parses a #rrggbb or #rgb hex string into [r, g, b]. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim();
  if (h.length === 4) {
    return [
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
      parseInt(h[3] + h[3], 16),
    ];
  }
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

function makeParticle(w: number, h: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    driftX: Math.cos(angle) * DRIFT_SPEED,
    driftY: Math.sin(angle) * DRIFT_SPEED,
    pushX: 0,
    pushY: 0,
    r: Math.random() * 1.4 + 1.0,
  };
}

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: Particle[] = Array.from({ length: COUNT }, () =>
      makeParticle(width, height)
    );

    let mouseX = -9999;
    let mouseY = -9999;
    let rafId = 0;

    // Track mouse on window so pointer-events:none on canvas still works
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const onWindowLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };
    const onResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onWindowLeave);
    window.addEventListener("resize", onResize);

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      // Resolve theme color each frame so dark-mode transitions are instant
      const rawColor =
        getComputedStyle(canvas).getPropertyValue("--bg-particle").trim() ||
        "#c8c6c0";
      const [r, g, b] = hexToRgb(rawColor);
      const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;

      // ── Update positions ──────────────────────────────────────────────────
      for (const p of particles) {
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dSq = dx * dx + dy * dy;

        if (dSq < REPEL_RADIUS_SQ && dSq > 0) {
          const dist = Math.sqrt(dSq);
          const strength = (1 - dist / REPEL_RADIUS) * REPEL_FORCE;
          p.pushX += (dx / dist) * strength;
          p.pushY += (dy / dist) * strength;
        }

        // Decay impulse — feels snappy but not instant
        p.pushX *= 0.87;
        p.pushY *= 0.87;

        // Cap impulse magnitude
        const mag = Math.sqrt(p.pushX * p.pushX + p.pushY * p.pushY);
        if (mag > MAX_PUSH) {
          const inv = MAX_PUSH / mag;
          p.pushX *= inv;
          p.pushY *= inv;
        }

        p.x += p.driftX + p.pushX;
        p.y += p.driftY + p.pushY;

        // Bounce only the drift component so impulse doesn't flip
        if (p.x < 0) {
          p.x = 0;
          p.driftX = Math.abs(p.driftX);
        } else if (p.x > width) {
          p.x = width;
          p.driftX = -Math.abs(p.driftX);
        }
        if (p.y < 0) {
          p.y = 0;
          p.driftY = Math.abs(p.driftY);
        } else if (p.y > height) {
          p.y = height;
          p.driftY = -Math.abs(p.driftY);
        }
      }

      // ── Draw lines ────────────────────────────────────────────────────────
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length - 1; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < LINK_DIST_SQ) {
            const alpha = (1 - Math.sqrt(dSq) / LINK_DIST) * 0.45;
            ctx.beginPath();
            ctx.strokeStyle = rgba(alpha);
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // ── Draw dots ─────────────────────────────────────────────────────────
      ctx.fillStyle = rgba(0.72);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onWindowLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
