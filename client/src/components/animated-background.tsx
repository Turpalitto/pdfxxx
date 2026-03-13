import { useMemo } from "react";

const PARTICLE_COUNT = 10;
const COLORS = [
  "rgba(99,102,241,0.15)",
  "rgba(59,130,246,0.12)",
  "rgba(139,92,246,0.10)",
];

export function AnimatedBackground() {
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

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full blur-2xl bg-particle"
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
}
