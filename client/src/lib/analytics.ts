// ============================================================
// Optional analytics — Plausible (script is only injected when
// VITE_PLAUSIBLE_URL and VITE_PLAUSIBLE_DOMAIN are configured).
// ============================================================

interface PlausibleWindow {
  plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
}

export function initAnalytics(): void {
  const url = import.meta.env.VITE_PLAUSIBLE_URL as string | undefined;
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
  if (!url || !domain) return;

  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = domain;
  script.src = url;
  document.head.appendChild(script);
}

/** Fire a custom event (no-op until Plausible is configured). */
export function trackEvent(event: string, props?: Record<string, unknown>): void {
  const w = window as unknown as PlausibleWindow;
  w.plausible?.(event, props ? { props } : undefined);
}
