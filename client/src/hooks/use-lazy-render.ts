import { useEffect, useRef, useState } from "react";

export function useLazyRender(boxCount: number, chunkSize = 12) {
  const [visibleCount, setVisibleCount] = useState(chunkSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount((prev) => Math.min(prev, boxCount));
  }, [boxCount]);

  useEffect(() => {
    if (visibleCount >= boxCount) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + chunkSize, boxCount));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, boxCount, chunkSize]);

  return { visibleCount, sentinelRef };
}