import { afterEach, describe, expect, it, vi } from 'vitest';

describe('nested-worker-probe', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps nested-worker capability to the OCR execution target', async () => {
    const { ocrExecutionTarget } = await import('./nested-worker-probe');
    expect(ocrExecutionTarget(true)).toBe('worker');
    expect(ocrExecutionTarget(false)).toBe('main');
  });

  it('resolves to false when Worker is unavailable (node / SSR)', async () => {
    vi.resetModules();
    const { probeNestedWorkers } = await import('./nested-worker-probe');
    expect(typeof Worker).toBe('undefined');
    await expect(probeNestedWorkers()).resolves.toBe(false);
  });

  it('caches the probe result (single worker spawn per page)', async () => {
    vi.resetModules();
    let constructed = 0;

    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;

      constructor(_url: string) {
        constructed += 1;
        // Имитация успешного pong от вложенной цепочки.
        setTimeout(() => {
          this.onmessage?.(new MessageEvent('message', { data: 'pong' }));
        }, 0);
      }

      postMessage(): void {}
      terminate(): void {}
    }
    vi.stubGlobal('Worker', FakeWorker);

    const { probeNestedWorkers } = await import('./nested-worker-probe');
    await expect(probeNestedWorkers()).resolves.toBe(true);
    await expect(probeNestedWorkers()).resolves.toBe(true);
    expect(constructed).toBe(1);
  });

  it('resolves to false on probe timeout', async () => {
    vi.resetModules();

    class SilentWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      constructor(_url: string) {}
      postMessage(): void {}
      terminate(): void {}
    }
    vi.stubGlobal('Worker', SilentWorker);

    const { probeNestedWorkers } = await import('./nested-worker-probe');
    await expect(probeNestedWorkers(30)).resolves.toBe(false);
  });
});
