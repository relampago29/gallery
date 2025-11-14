"use client";
import React, { useRef, useState, useCallback } from "react";
import clsx from "clsx";

/**
 * CardGlare
 * - Tilt 3D suave conforme o mouse
 * - Glare radial que segue o mouse
 * - Streak diagonal (sheen) com mix-blend
 * - Glow de borda em hover
 *
 * NÃO altera o tamanho do filho. Só overlays absolutas com pointer-events:none.
 */
type Props = {
  children: React.ReactNode;
  className?: string;
  /** força do tilt em graus (0–20) */
  tilt?: number;
  /** intensidade do brilho radial (0–1) */
  glare?: number;
  /** raio do brilho radial (px) */
  radius?: number;
  /** cor base do brilho radial */
  color?: string;
  /** arredondamento: ex "1rem", "16px" */
  rounded?: string;
  /** escala em hover (1–1.06) */
  scale?: number;
};

export default function CardGlare({
  children,
  className,
  tilt = 10,
  glare = 0.35,
  radius = 240,
  color = "255,255,255", // RGB
  rounded = "1rem",
  scale = 1.02,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [vars, setVars] = useState({
    rx: 0,
    ry: 0,
    x: 0.5,
    y: 0.5,
  });

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;  // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const ry = (px - 0.5) * tilt * 2;                // -tilt..tilt
    const rx = -(py - 0.5) * tilt * 2;               // -tilt..tilt
    setVars({ rx, ry, x: px, y: py });
  }, [tilt]);

  const onEnter = useCallback(() => setHover(true), []);
  const onLeave = useCallback(() => {
    setHover(false);
    setVars({ rx: 0, ry: 0, x: 0.5, y: 0.5 });
  }, []);

  // estilos calculados
  const transform = hover
    ? `rotateX(${vars.rx}deg) rotateY(${vars.ry}deg) scale(${scale})`
    : `rotateX(0deg) rotateY(0deg) scale(1)`;

  const glareStyle: React.CSSProperties = {
    borderRadius: rounded,
    background: `radial-gradient(${radius}px ${radius}px at ${vars.x * 100}% ${vars.y * 100}%, rgba(${color}, ${glare}) 0%, rgba(${color}, 0) 60%)`,
    opacity: hover ? 1 : 0,
    transition: "opacity 200ms ease",
    mixBlendMode: "screen",
  };

  // streak “sheen” diagonal
  const sheenStyle: React.CSSProperties = {
    borderRadius: rounded,
    background:
      "linear-gradient(55deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0) 60%)",
    opacity: hover ? 0.6 : 0,
    transition: "opacity 240ms ease",
    mixBlendMode: "screen",
    transform: `translate(${(vars.x - 0.5) * 20}px, ${(vars.y - 0.5) * 20}px)`,
  };

  // glow de borda
  const borderGlowStyle: React.CSSProperties = {
    borderRadius: rounded,
    boxShadow: hover
      ? "0 0 0 1px rgba(255,255,255,0.08) inset, 0 20px 60px rgba(0,0,0,0.35), 0 0 80px rgba(150,170,255,0.15)"
      : "0 0 0 1px rgba(255,255,255,0.06) inset, 0 10px 30px rgba(0,0,0,0.25)",
    transition: "box-shadow 220ms ease",
  };

  return (
    <div
      ref={ref}
      className={clsx("relative block will-change-transform", className)}
      style={{ perspective: "1000px", borderRadius: rounded }}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {/* content container que sofre o tilt */}
      <div
        className="relative block transition-transform duration-150 ease-out"
        style={{
          transform,
          transformStyle: "preserve-3d",
          borderRadius: rounded,
        }}
      >
        {/* conteúdo do card */}
        {children}

        {/* overlays */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={glareStyle}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={sheenStyle}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={borderGlowStyle}
        />
      </div>
    </div>
  );
}
