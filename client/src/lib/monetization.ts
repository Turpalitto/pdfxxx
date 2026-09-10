// ============================================================
// Monetization skeleton — premium-гейты и офлайн-лицензии (ADR-019)
// ============================================================
//
// Каркас премиум-модели без биллинга. Гейты включаются только через env:
//   VITE_PREMIUM_ENABLED=1          — включить модель (любое иное значение = выкл)
//   VITE_PREMIUM_FEATURES=ocr,bigfile,batch — какие гейты активны (csv)
//   VITE_PREMIUM_PUBLIC_KEY=<64 hex> — Ed25519 public key для проверки лицензий
//
// Лицензия офлайн-формата: 'PDFX-<base64url(64B)>' — Ed25519-подпись над
// сообщением 'pdfx-pro-v1'. Проверка полностью локальная (crypto.subtle);
// обход гейта технически тривиален — осознанный компромисс (см. ADR-019).

import { useCallback, useEffect, useState } from 'react';

export type PremiumFeature = 'ocr' | 'bigfile' | 'batch';

export interface PremiumConfig {
  enabled: boolean;
  features: PremiumFeature[];
  /** Ed25519 public key (64 hex), задан только при валидном значении env */
  publicKeyHex?: string;
}

const KNOWN_FEATURES: readonly PremiumFeature[] = ['ocr', 'bigfile', 'batch'];

/** Гейты: файлы тяжелее 50 МБ и пакеты больше 5 файлов. */
export const BIGFILE_LIMIT_BYTES = 50 * 1024 * 1024;
export const BATCH_LIMIT_FILES = 5;

export const LICENSE_STORAGE_KEY = 'pdfx.license.v1';
export const LICENSE_MESSAGE = 'pdfx-pro-v1';

/** Ключ: PDFX- + base64url Ed25519-подписи (64 байта → 86 символов без padding). */
export const LICENSE_KEY_RE = /^PDFX-([A-Za-z0-9_-]{86})$/;

interface PremiumEnv {
  VITE_PREMIUM_ENABLED?: string;
  VITE_PREMIUM_FEATURES?: string;
  VITE_PREMIUM_PUBLIC_KEY?: string;
}

/** Конфиг premium-модели из env. Невалидный public key молча игнорируется. */
export function getPremiumConfig(env: PremiumEnv = import.meta.env as PremiumEnv): PremiumConfig {
  const enabled = env.VITE_PREMIUM_ENABLED === '1';
  const features = (env.VITE_PREMIUM_FEATURES ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is PremiumFeature =>
      (KNOWN_FEATURES as readonly string[]).includes(value),
    );
  const rawKey = (env.VITE_PREMIUM_PUBLIC_KEY ?? '').trim().toLowerCase();
  const publicKeyHex = /^[0-9a-f]{64}$/.test(rawKey) ? rawKey : undefined;
  return { enabled, features, publicKeyHex };
}

export interface PremiumGateContext {
  isPro: boolean;
  fileSizeBytes?: number;
  filesCount?: number;
}

/**
 * Проверка premium-гейта для инструмента. Возвращает заблокировавшую фичу
 * или null (операция разрешена). Без enabled и при isPro всё разрешено;
 * конкретный гейт срабатывает, только если его фича есть в списке
 * VITE_PREMIUM_FEATURES.
 */
export function checkPremiumGate(
  slug: string,
  ctx: PremiumGateContext,
  config: PremiumConfig = getPremiumConfig(),
): PremiumFeature | null {
  if (!config.enabled || ctx.isPro) return null;
  if (slug === 'ocr-pdf' && config.features.includes('ocr')) return 'ocr';
  if ((ctx.fileSizeBytes ?? 0) > BIGFILE_LIMIT_BYTES && config.features.includes('bigfile')) {
    return 'bigfile';
  }
  if ((ctx.filesCount ?? 0) > BATCH_LIMIT_FILES && config.features.includes('batch')) {
    return 'batch';
  }
  return null;
}

export function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Проверка лицензионного ключа. Формат проверяется всегда; если задан
 * public key — дополнительно проверяется Ed25519-подпись над сообщением
 * 'pdfx-pro-v1' (crypto.subtle). Без public key (например, при отладке)
 * достаточно валидного формата.
 */
export async function verifyLicenseKey(
  key: string,
  config: PremiumConfig = getPremiumConfig(),
): Promise<boolean> {
  const match = LICENSE_KEY_RE.exec(key.trim());
  if (!match) return false;
  const signature = base64UrlToBytes(match[1]);
  if (!signature || signature.length !== 64) return false;
  if (!config.publicKeyHex) return true;
  try {
    const publicKey = await crypto.subtle.importKey(
      'raw',
      hexToBytes(config.publicKeyHex) as BufferSource,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    const message = new TextEncoder().encode(LICENSE_MESSAGE);
    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      publicKey,
      signature as BufferSource,
      message,
    );
  } catch {
    return false;
  }
}

export interface PremiumState {
  isPro: boolean;
  licenseKey: string | null;
  /** машинный код ошибки активации ('invalid-license') или null */
  error: string | null;
  activate: (key: string) => Promise<boolean>;
  deactivate: () => void;
}

/**
 * Состояние лицензии пользователя. На монтировании читает сохранённый ключ
 * из localStorage и перепроверяет его; невалидный ключ вычищается.
 */
export function usePremium(): PremiumState {
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored) {
      void verifyLicenseKey(stored).then((ok) => {
        if (cancelled) return;
        if (ok) {
          setLicenseKey(stored);
          setIsPro(true);
        } else {
          try {
            localStorage.removeItem(LICENSE_STORAGE_KEY);
          } catch {
            // ignore
          }
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const activate = useCallback(async (key: string): Promise<boolean> => {
    setError(null);
    const trimmed = key.trim();
    const ok = await verifyLicenseKey(trimmed);
    if (!ok) {
      setError('invalid-license');
      return false;
    }
    try {
      localStorage.setItem(LICENSE_STORAGE_KEY, trimmed);
    } catch {
      // localStorage может быть недоступен — Pro живёт до конца сессии
    }
    setLicenseKey(trimmed);
    setIsPro(true);
    return true;
  }, []);

  const deactivate = useCallback(() => {
    try {
      localStorage.removeItem(LICENSE_STORAGE_KEY);
    } catch {
      // ignore
    }
    setLicenseKey(null);
    setIsPro(false);
    setError(null);
  }, []);

  return { isPro, licenseKey, error, activate, deactivate };
}

/** Текст апселла для заблокированной фичи (en/ru, для остальных языков — en). */
export function premiumUpsellMessage(feature: PremiumFeature, lang: string): string {
  const ru = lang === 'ru';
  switch (feature) {
    case 'ocr':
      return ru
        ? 'OCR доступен в PDFX Pro. Активируйте лицензию на странице тарифов.'
        : 'OCR is a PDFX Pro feature. Activate a license on the pricing page.';
    case 'bigfile':
      return ru
        ? 'Файлы больше 50 МБ доступны в PDFX Pro. Активируйте лицензию на странице тарифов.'
        : 'Files over 50 MB require PDFX Pro. Activate a license on the pricing page.';
    case 'batch':
      return ru
        ? 'Пакетная обработка больше 5 файлов доступна в PDFX Pro.'
        : 'Batch processing of more than 5 files requires PDFX Pro.';
  }
}
