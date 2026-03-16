import { memo, useMemo } from "react";

const PARTICLE_COUNT = 6;
const COLORS = [
  "rgba(99,102,241,0.18)",
  "rgba(59,130,246,0.14)",
  "rgba(139,92,246,0.12)",
];

export const AnimatedBackground = memo(function AnimatedBackground() {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        id: i,
        x: ((i * 37 + 13) % 100),
        y: ((i * 53 + 7) % 100),
        size: (i % 3) * 1.5 + 4,
        duration: 14 + (i % 5) * 4,
        delay: (i % 4) * 2,
        color: COLORS[i % 3],
      })),
    []
  );

  const orbs = useMemo(
    () => [
      {
        id: "blue",
        left: "10%",
        top: "8%",
        width: "28rem",
        height: "28rem",
        background: "radial-gradient(circle, rgba(59,130,246,0.24) 0%, rgba(59,130,246,0.08) 45%, transparent 72%)",
        duration: "22s",
      },
      {
        id: "cyan",
        left: "54%",
        top: "18%",
        width: "22rem",
        height: "22rem",
        background: "radial-gradient(circle, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0.06) 44%, transparent 72%)",
        duration: "20s",
      },
    ],
    []
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute inset-0 app-grid-overlay" />
      <div className="absolute inset-0 hero-radial-glow" />

      {orbs.map((orb, index) => (
        <div
          key={orb.id}
          className={`absolute aurora-orb gpu-layer rounded-full aurora-orb-${index + 1}`}
          style={{
            left: orb.left,
            top: orb.top,
            width: orb.width,
            height: orb.height,
            background: orb.background,
            "--duration": orb.duration,
            "--delay": `${index * 1.8}s`,
          } as React.CSSProperties}
        />
      ))}

      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full blur-2xl bg-particle gpu-layer bg-particle-${p.id}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}rem`,
            height: `${p.size}rem`,
            background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
            "--duration": `${p.duration}s`,
            "--delay": `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
});
