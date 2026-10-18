"use client";

import { useEffect, useRef } from "react";

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle definitions
    interface Particle {
      x: number;
      y: number;
      radius: number;
      alpha: number;
      speed: number;
      angle: number;
      orbitRadius: number;
    }

    // Stars in background
    const stars: { x: number; y: number; r: number; alpha: number; delta: number }[] = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        delta: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      });
    }

    // Celestial Particle Ring around center
    const particles: Particle[] = [];
    const count = 320;
    for (let i = 0; i < count; i++) {
      const orbitRadius = Math.min(width, height) * 0.32 + (Math.random() - 0.5) * 80;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.1;
      particles.push({
        x: width / 2 + Math.cos(angle) * orbitRadius,
        y: height / 2 + Math.sin(angle) * orbitRadius * 0.65, // elliptical tilt
        radius: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        speed: (Math.random() * 0.0015 + 0.0008) * (Math.random() > 0.5 ? 1 : -1),
        angle,
        orbitRadius,
      });
    }

    // Render loop
    const render = () => {
      ctx.fillStyle = "#03040a";
      ctx.fillRect(0, 0, width, height);

      // Deep radial cosmic glow in center
      const centerX = width / 2;
      const centerY = height / 2;
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        50,
        centerX,
        centerY,
        Math.max(width, height) * 0.6
      );
      gradient.addColorStop(0, "rgba(23, 37, 84, 0.45)"); // deep blue nebula
      gradient.addColorStop(0.35, "rgba(15, 23, 42, 0.35)");
      gradient.addColorStop(0.7, "rgba(2, 6, 23, 0.85)");
      gradient.addColorStop(1, "#03040a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw background stars
      for (const s of stars) {
        s.alpha += s.delta;
        if (s.alpha > 0.9) {
          s.alpha = 0.9;
          s.delta *= -1;
        } else if (s.alpha < 0.2) {
          s.alpha = 0.2;
          s.delta *= -1;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw cosmic elliptical particle ring
      for (const p of particles) {
        p.angle += p.speed;
        p.x = centerX + Math.cos(p.angle) * p.orbitRadius;
        p.y = centerY + Math.sin(p.angle) * (p.orbitRadius * 0.62);

        ctx.fillStyle = `rgba(186, 230, 253, ${p.alpha})`; // luminous light cyan/blue
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 block w-full h-full" />
  );
}
