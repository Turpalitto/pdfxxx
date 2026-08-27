import { type Express, type Request, type Response } from 'express';

// ============================================================
// First-party error beacon.
// ============================================================
// Opt-in via ENABLE_ERROR_REPORTING=1. Stores a small in-memory ring
// buffer (no persistence, no PII). Recent reports are readable only
// with the ERROR_REPORT_TOKEN bearer token. Rate limited per IP.

interface ErrorRecord {
  kind: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  url?: string;
  ts: number;
  ip?: string;
}

const MAX_RECORDS = 200;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

const records: ErrorRecord[] = [];
const hitsByIp = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (hitsByIp.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  hitsByIp.set(ip, hits);
  return hits.length > RATE_LIMIT;
}

export function registerErrorReportRoutes(app: Express): void {
  const enabled = process.env.ENABLE_ERROR_REPORTING === '1';
  const token = process.env.ERROR_REPORT_TOKEN;

  app.get('/api/error-report/status', (_req: Request, res: Response) => {
    res.json({ enabled });
  });

  app.post('/api/error-report', (req: Request, res: Response) => {
    if (!enabled) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    const ip = req.ip ?? 'unknown';
    if (rateLimited(ip)) {
      res.status(429).json({ message: 'Too many reports' });
      return;
    }
    const body = req.body as Partial<ErrorRecord> | undefined;
    if (!body || typeof body.message !== 'string' || body.message.length > 2000) {
      res.status(400).json({ message: 'Invalid payload' });
      return;
    }
    records.push({
      kind: typeof body.kind === 'string' ? body.kind.slice(0, 32) : 'unknown',
      message: body.message,
      stack: typeof body.stack === 'string' ? body.stack.slice(0, 4000) : undefined,
      context:
        body.context && typeof body.context === 'object'
          ? (JSON.parse(JSON.stringify(body.context)) as Record<string, unknown>)
          : undefined,
      url: typeof body.url === 'string' ? body.url.slice(0, 200) : undefined,
      ts: typeof body.ts === 'number' ? body.ts : Date.now(),
      ip,
    });
    if (records.length > MAX_RECORDS) records.shift();
    res.json({ ok: true });
  });

  app.get('/api/error-report/recent', (req: Request, res: Response) => {
    if (!enabled || !token) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    if (req.headers.authorization !== `Bearer ${token}`) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    res.json({ count: records.length, records: records.slice(-100).reverse() });
  });
}
