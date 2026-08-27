// ============================================================
// Error beacon — first-party, dependency-free error reporting.
// ============================================================
// Privacy-first: POSTs a tiny JSON payload to our own server only when
// the server explicitly opted in (ENABLE_ERROR_REPORTING=1). No third
// parties, no PII, best-effort delivery (never throws to the caller).

const MAX_QUEUE = 8;
let enabled = false;
let initialized = false;
const queue: Array<Record<string, unknown>> = [];

function post(payload: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    const body = JSON.stringify(payload);
    if (body.length > 16_000) return;
    void fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // never let reporting break the app
  }
}

function normalize(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack?.slice(0, 4000) };
  try {
    return { message: JSON.stringify(err)?.slice(0, 1000) ?? String(err) };
  } catch {
    return { message: String(err) };
  }
}

function report(kind: string, err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  const { message, stack } = normalize(err);
  queue.push({
    kind,
    message,
    stack,
    context,
    url: typeof location !== 'undefined' ? location.pathname : undefined,
    ts: Date.now(),
  });
  if (queue.length > MAX_QUEUE) queue.shift();
  post(queue.shift() as Record<string, unknown>);
}

/** Manual reporting hook (e.g. from worker error handlers). */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  report('manual', err, context);
}

/** Installs global handlers and asks the server whether reporting is enabled. */
export async function initErrorReporting(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const res = await fetch('/api/error-report/status');
    const data = (await res.json()) as { enabled?: boolean };
    enabled = data.enabled === true;
  } catch {
    return;
  }
  if (!enabled) return;

  window.addEventListener('error', (e) => {
    report('window', e.error ?? e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    report('promise', e.reason);
  });
}
