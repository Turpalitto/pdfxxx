import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('location', { pathname: '/tools/merge-pdf' });
vi.stubGlobal('window', {
  addEventListener: vi.fn(),
});

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock);

async function loadBeacon(enabled: boolean) {
  vi.resetModules();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/error-report/status') {
      return new Response(JSON.stringify({ enabled }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('{"ok":true}', { status: 200 });
  });
  const mod = await import('./error-report');
  await mod.initErrorReporting();
  return mod;
}

describe('error-report beacon (client)', () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  it('does nothing while the server has not opted in', async () => {
    const { reportError } = await loadBeacon(false);

    reportError(new Error('hidden'), { source: 'test' });
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the status check
  });

  it('posts manual reports with context, url and kind', async () => {
    const { reportError } = await loadBeacon(true);

    reportError(new Error('boom'), { source: 'unit-test' });
    reportError(new Error('second'), {});

    expect(fetchMock).toHaveBeenCalledTimes(3); // status + 2 posts
    const bodies = fetchMock.mock.calls
      .filter((call) => String(call[0]) === '/api/error-report')
      .map((call) => JSON.parse(String((call[1] as RequestInit).body)));
    expect(bodies[0]).toMatchObject({
      kind: 'manual',
      message: 'boom',
      context: { source: 'unit-test' },
      url: '/tools/merge-pdf',
    });
    expect(bodies[1]).toMatchObject({ kind: 'manual', message: 'second' });
  });

  it('normalizes non-Error payloads and never throws', async () => {
    const { reportError } = await loadBeacon(true);
    fetchMock.mockClear();

    expect(() => reportError({ weird: 'value' })).not.toThrow();

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => reportError(circular)).not.toThrow();
  });

  it('keeps posting after network failures', async () => {
    const { reportError } = await loadBeacon(true);

    for (let i = 0; i < 3; i++) {
      fetchMock.mockImplementationOnce(async () => {
        throw new Error('offline');
      });
      reportError(new Error(`e-${i}`));
    }

    reportError(new Error('after-failures'));
    expect(fetchMock).toHaveBeenCalledTimes(5); // status + 3 failed posts + recovered post
  });
});
