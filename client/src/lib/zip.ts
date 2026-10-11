// ============================================================
// ZIP — единая точка архивации на fflate (замена jszip)
// ============================================================
//
// Почему fflate вместо jszip:
//   • быстрее и заметно меньше по бандлу (~8 кБ против ~100 кБ);
//   • async-вариант fflate уходит в пул веб-воркеров, поэтому
//     большие архивы (десятки страниц-JPEG, split-части) не
//     блокируют главный поток — у jszip такой возможности нет;
//   • уровень сжатия задаётся в одном месте, а не в каждом
//     вызывающем модуле.
//
// Все вызовы в проекте асинхронные, поэтому публичное API здесь
// тоже async — это заодно снимает риск блокировки UI на больших
// наборах файлов.

export interface ZipEntry {
  name: string;
  bytes: Uint8Array;
}

/** Уровень DEFLATE. 6 — разумный баланс между размером и скоростью. */
const ZIP_LEVEL = 6;

/**
 * Собирает ZIP-архив из именованных частей.
 *
 * Использует воркер-пул fflate: главный поток остаётся свободным,
 * пока архивируются мегабайты данных.
 */
export async function zipEntries(entries: ZipEntry[]): Promise<Uint8Array> {
  const fflate = await import('fflate');
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    files[entry.name] = entry.bytes;
  }
  return new Promise<Uint8Array>((resolve, reject) => {
    fflate.zip(files, { level: ZIP_LEVEL }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

/**
 * Собирает ZIP из частей, заданных как base64 (например, data-URL
 * картинок из pdfToImages). Префикс data-URL при этом отбрасывается.
 */
export async function zipBase64Entries(
  entries: { name: string; base64: string }[],
): Promise<Uint8Array> {
  return zipEntries(
    entries.map((entry) => ({
      name: entry.name,
      bytes: base64ToBytes(entry.base64),
    })),
  );
}

/** base64 (без data-URL префикса) → байты. */
export function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Достаёт base64-часть из data-URL. Возвращает null, если её нет. */
export function dataUrlToBase64(dataUrl: string): string | null {
  const index = dataUrl.indexOf(',');
  if (index === -1) return null;
  return dataUrl.slice(index + 1) || null;
}

/**
 * Читает один файл из ZIP — используется тестами конвертеров
 * (распаковка .docx/.xlsx для проверки XML).
 */
export async function readZipEntry(zipBytes: Uint8Array, name: string): Promise<string | null> {
  const fflate = await import('fflate');
  const files = fflate.unzipSync(zipBytes);
  const file = files[name];
  if (!file) return null;
  return fflate.strFromU8(file);
}
