import { memo, useMemo } from "react";

const STAR_COUNT = 60;

export const AnimatedBackground = memo(function AnimatedBackground() {
  const stars = useMemo(
    () =>
      Array.from({ length: STAR_COUNT }, (_, i) => ({
        id: i,
        x: ((i * 61 + 17) % 100),
        y: ((i * 43 + 29) % 100),
        size: i % 3 === 0 ? 1.5 : i % 5 === 0 ? 1 : 0.5,
        opacity: ((i * 7) % 40) / 100 + 0.1,
        twinkle: i % 4 === 0,
        twinkleDuration: 2 + (i % 3),
        twinkleDelay: (i % 5) * 0.8,
      })),
    [],
  );

  const orbs = useMemo(
    () => [
      {
        id: "blue",
        left: "-5%",
        top: "5%",
        width: "36rem",
        height: "36rem",
        background:
          "radial-gradient(circle, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0.06) 50%, transparent 75%)",
        duration: "24s",
      },
      {
        id: "violet",
        left: "55%",
        top: "10%",
        width: "28rem",
        height: "28rem",
        background:
          "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.05) 50%, transparent 75%)",
        duration: "20s",
      },
      {
        id: "cyan",
        left: "30%",
        top: "55%",
        width: "20rem",
        height: "20rem",
        background:
          "radial-gradient(circle, rgba(34,211,238,0.12) 0%, rgba(34,211,238,0.04) 50%, transparent 75%)",
        duration: "28s",
      },
    ],
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 app-grid-overlay" />

      {/* Hero radial glow */}
      <div className="absolute inset-0 hero-radial-glow" />

      {/* Aurora orbs */}
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
            "--delay": `${index * 2.4}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Star field */}
      {stars.map((star) => (
        <div
          key={star.id}
          className={star.twinkle ? "star-twinkle" : ""}
          style={{
            position: "absolute",
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: "50%",
            background: "rgba(255,255,255,1)",
            opacity: star.opacity,
            animationDuration: star.twinkle ? `${star.twinkleDuration}s` : undefined,
            animationDelay: star.twinkle ? `${star.twinkleDelay}s` : undefined,
          }}
        />
      ))}
    </div>
  );
});
