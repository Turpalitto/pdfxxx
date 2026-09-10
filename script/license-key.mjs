#!/usr/bin/env node
// Генератор офлайн-лицензий PDFX Pro (ADR-019).
//
// Создаёт пару Ed25519 и подписывает фиксированное сообщение 'pdfx-pro-v1'.
// Публичный ключ (64 hex) зашивается в сборку через VITE_PREMIUM_PUBLIC_KEY,
// ключ лицензии 'PDFX-<base64url(signature)>' выдаётся пользователю.
// Приватный ключ печатается ТОЛЬКО в stdout-комментарии — не коммитить.
//
// Запуск: npm run license:generate

import { generateKeyPairSync, sign } from 'node:crypto';

const MESSAGE = 'pdfx-pro-v1';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

// Raw 32-байтовый публичный ключ — последние 32 байта SPKI DER.
const publicKeyHex = publicKey
  .export({ format: 'der', type: 'spki' })
  .subarray(-32)
  .toString('hex');

const signature = sign(null, Buffer.from(MESSAGE, 'utf8'), privateKey);
const licenseKey = `PDFX-${signature.toString('base64url')}`;

console.log('# PDFX Pro license generator (Ed25519 over "pdfx-pro-v1")');
console.log(`VITE_PREMIUM_PUBLIC_KEY=${publicKeyHex}`);
console.log(
  `# private key (pkcs8 hex, KEEP SECRET — do not commit): ${privateKey.export({ format: 'der', type: 'pkcs8' }).toString('hex')}`,
);
console.log(`PRO_LICENSE_KEY=${licenseKey}`);
