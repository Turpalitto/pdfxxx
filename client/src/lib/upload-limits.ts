export const MB = 1024 * 1024;

// Practical ceiling for browser-side processing on average desktop hardware.
export const DEFAULT_MAX_FILE_SIZE_MB = 500;

export function mbToBytes(mb: number): number {
  return mb * MB;
}
