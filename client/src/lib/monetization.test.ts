import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BIGFILE_LIMIT_BYTES,
  BATCH_LIMIT_FILES,
  LICENSE_MESSAGE,
  base64UrlToBytes,
  checkPremiumGate,
  getPremiumConfig,
  premiumUpsellMessage,
  verifyLicenseKey,
} from './monetization';

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Ключ правильного формата (PDFX- + 86 base64url-символов подписи-заглушки).
const FORMAT_OK_KEY = `PDFX-${'a'.repeat(86)}`;

describe('monetization', () => {
  beforeEach(() => {
    // vi.stubEnv только внутри хуков/тестов: на уровне тела describe stub
    // применяется до парсинга окружения и не работает как ожидается.
    vi.stubEnv('VITE_PREMIUM_ENABLED', '');
    vi.stubEnv('VITE_PREMIUM_FEATURES', '');
    vi.stubEnv('VITE_PREMIUM_PUBLIC_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows everything when premium is disabled (default)', () => {
    const gate = checkPremiumGate('ocr-pdf', {
      isPro: false,
      fileSizeBytes: BIGFILE_LIMIT_BYTES + 1,
      filesCount: BATCH_LIMIT_FILES + 10,
    });
    expect(gate).toBeNull();
    expect(getPremiumConfig().enabled).toBe(false);
  });

  it('gates ocr-pdf as the ocr feature when enabled and listed', () => {
    vi.stubEnv('VITE_PREMIUM_ENABLED', '1');
    vi.stubEnv('VITE_PREMIUM_FEATURES', 'ocr,bigfile');
    expect(checkPremiumGate('ocr-pdf', { isPro: false })).toBe('ocr');
    expect(checkPremiumGate('merge-pdf', { isPro: false })).toBeNull();
    // Не в списке фич — не гейтится даже при enabled.
    vi.stubEnv('VITE_PREMIUM_FEATURES', 'bigfile');
    expect(checkPremiumGate('ocr-pdf', { isPro: false })).toBeNull();
  });

  it('gates files over 50 MB as bigfile', () => {
    vi.stubEnv('VITE_PREMIUM_ENABLED', '1');
    vi.stubEnv('VITE_PREMIUM_FEATURES', 'bigfile');
    expect(
      checkPremiumGate('compress-pdf', { isPro: false, fileSizeBytes: BIGFILE_LIMIT_BYTES + 1 }),
    ).toBe('bigfile');
    expect(
      checkPremiumGate('compress-pdf', { isPro: false, fileSizeBytes: BIGFILE_LIMIT_BYTES }),
    ).toBeNull();
  });

  it('gates batches over 5 files only when batch is listed', () => {
    vi.stubEnv('VITE_PREMIUM_ENABLED', '1');
    vi.stubEnv('VITE_PREMIUM_FEATURES', 'batch');
    expect(checkPremiumGate('merge-pdf', { isPro: false, filesCount: BATCH_LIMIT_FILES + 1 })).toBe(
      'batch',
    );
    expect(
      checkPremiumGate('merge-pdf', { isPro: false, filesCount: BATCH_LIMIT_FILES }),
    ).toBeNull();
    vi.stubEnv('VITE_PREMIUM_FEATURES', 'ocr');
    expect(
      checkPremiumGate('merge-pdf', { isPro: false, filesCount: BATCH_LIMIT_FILES + 1 }),
    ).toBeNull();
  });

  it('lets Pro users through every gate', () => {
    vi.stubEnv('VITE_PREMIUM_ENABLED', '1');
    vi.stubEnv('VITE_PREMIUM_FEATURES', 'ocr,bigfile,batch');
    expect(
      checkPremiumGate('ocr-pdf', {
        isPro: true,
        fileSizeBytes: BIGFILE_LIMIT_BYTES * 2,
        filesCount: 99,
      }),
    ).toBeNull();
  });

  it('ignores an invalid public key in config (keeps format-only verification)', async () => {
    vi.stubEnv('VITE_PREMIUM_ENABLED', '1');
    vi.stubEnv('VITE_PREMIUM_PUBLIC_KEY', 'not-hex-at-all');
    const config = getPremiumConfig();
    expect(config.publicKeyHex).toBeUndefined();
    await expect(verifyLicenseKey(FORMAT_OK_KEY, config)).resolves.toBe(true);
  });

  it('rejects malformed license keys and non-64-byte payloads', async () => {
    await expect(verifyLicenseKey('')).resolves.toBe(false);
    await expect(verifyLicenseKey('PDFX-short')).resolves.toBe(false);
    await expect(verifyLicenseKey('PLAIN-without-prefix'.padEnd(91, 'x'))).resolves.toBe(false);
    // 86 chars, но base64url-подпись не 64 байта по длине после декода → отказ.
    const tiny = `PDFX-${bytesToBase64Url(new Uint8Array(8))}`;
    await expect(verifyLicenseKey(tiny)).resolves.toBe(false);
    expect(base64UrlToBytes('%%%')).toBeNull();
  });

  it('verifies a real Ed25519 license end-to-end and rejects tampered keys', async () => {
    const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
    vi.stubEnv('VITE_PREMIUM_ENABLED', '1');
    vi.stubEnv('VITE_PREMIUM_PUBLIC_KEY', bytesToHex(publicKeyBytes));

    const message = new TextEncoder().encode(LICENSE_MESSAGE);
    const signature = new Uint8Array(
      await crypto.subtle.sign({ name: 'Ed25519' }, keyPair.privateKey, message),
    );
    const key = `PDFX-${bytesToBase64Url(signature)}`;
    await expect(verifyLicenseKey(key)).resolves.toBe(true);

    // Подпись другим ключом → подделка не проходит.
    const other = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const forged = new Uint8Array(
      await crypto.subtle.sign({ name: 'Ed25519' }, other.privateKey, message),
    );
    await expect(verifyLicenseKey(`PDFX-${bytesToBase64Url(forged)}`)).resolves.toBe(false);

    // Битая подпись (flip одного байта) → тоже отказ.
    const tampered = signature.slice();
    tampered[10] ^= 0xff;
    await expect(verifyLicenseKey(`PDFX-${bytesToBase64Url(tampered)}`)).resolves.toBe(false);
  });

  it('rejects the same signature against a wrong message or key', async () => {
    const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
    vi.stubEnv('VITE_PREMIUM_ENABLED', '1');
    vi.stubEnv('VITE_PREMIUM_PUBLIC_KEY', bytesToHex(publicKeyBytes));

    const wrongMessage = new TextEncoder().encode('pdfx-pro-v2');
    const signature = new Uint8Array(
      await crypto.subtle.sign({ name: 'Ed25519' }, keyPair.privateKey, wrongMessage),
    );
    await expect(verifyLicenseKey(`PDFX-${bytesToBase64Url(signature)}`)).resolves.toBe(false);
  });

  it('upsells in English and Russian per feature', () => {
    expect(premiumUpsellMessage('ocr', 'en')).toContain('OCR');
    expect(premiumUpsellMessage('ocr', 'ru')).toContain('OCR');
    expect(premiumUpsellMessage('bigfile', 'en')).toContain('50 MB');
    expect(premiumUpsellMessage('bigfile', 'ru')).toContain('50');
    expect(premiumUpsellMessage('batch', 'en')).toContain('5 files');
    expect(premiumUpsellMessage('batch', 'ru')).toContain('5');
    // Неизвестный язык — английский fallback.
    expect(premiumUpsellMessage('ocr', 'de')).toContain('PDFX Pro');
  });
});
